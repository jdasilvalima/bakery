import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LotTag } from '@/components/lot-tag';
import { requireUser } from '@/lib/auth';
import type { Database } from '@/lib/database.types';
import { formatDate, formatQty, STAGES, stageLabel } from '@/lib/format';

export const metadata: Metadata = { title: 'Lot' };

type TraceRow = Database['public']['Functions']['trace_forward']['Returns'][number];
type Use = { quantity: number; unit: string };

const PRODUCTION_LABEL: Record<string, string> = {
  wip_batch: 'Mixed',
  pie_bake: 'Baked',
  cookie_deposit: 'Deposited',
  packaging: 'Packed',
};

export default async function LotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser();

  const { data: lot } = await supabase.from('lot_details').select('*').eq('id', id).maybeSingle();
  if (!lot) notFound();

  const [forward, backward, inputs, uses, production, delivery] = await Promise.all([
    supabase.rpc('trace_forward', { p_lot_id: id }),
    supabase.rpc('trace_backward', { p_lot_id: id }),
    supabase.from('lot_inputs').select('input_lot_id, quantity, unit').eq('output_lot_id', id),
    supabase.from('lot_inputs').select('output_lot_id, quantity, unit').eq('input_lot_id', id),
    lot.production_id
      ? supabase
          .from('productions')
          .select('kind, batches, bake_minutes, bake_temperature_f, comment, operator:staff(display_name)')
          .eq('id', lot.production_id)
          .single()
      : Promise.resolve(null),
    lot.delivery_id
      ? supabase.from('deliveries').select('receiver:staff(display_name)').eq('id', lot.delivery_id).single()
      : Promise.resolve(null),
  ]);

  const usedIn = new Map<string, Use>((uses.data ?? []).map((u) => [u.output_lot_id, u]));
  const madeFrom = new Map<string, Use>((inputs.data ?? []).map((i) => [i.input_lot_id, i]));
  const downstream = (forward.data ?? []).filter((r) => r.depth > 0);
  const upstream = (backward.data ?? []).filter((r) => r.depth > 0);

  const packed = downstream.filter((r) => r.kind === 'packed');
  const packedUnits = packed.reduce((sum, r) => sum + Number(r.quantity), 0);
  const products = [...new Set(downstream.filter((r) => r.kind === 'finished' || r.kind === 'packed').map((r) => r.item_name))];
  const usedShare = lot.quantity ? Math.min(1, 1 - Number(lot.remaining) / Number(lot.quantity)) : 0;
  const p = production?.data;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/lots" className="text-sm font-bold text-crust hover:underline">← All lots</Link>

      {created && (
        <p role="status" className="rise mt-5 rounded-md border-l-4 border-ok bg-paper px-4 py-3">
          Lot recorded. Every input was checked against what is left in stock.
        </p>
      )}

      <header className="rise mt-6 border-b-2 border-ink pb-8">
        <LotTag code={lot.lot_code!} kind={lot.kind!} className="!text-xl" />
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{lot.item_name}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <Fact label="Stage" value={stageLabel(lot.kind!)} />
          <Fact label={lot.delivery_id ? 'Received' : PRODUCTION_LABEL[p?.kind ?? ''] ?? 'Made'} value={formatDate(lot.made_on)} />
          <Fact label="Expires" value={formatDate(lot.expires_on)} />
          <Fact
            label={lot.delivery_id ? 'Source' : 'Operator'}
            value={
              lot.delivery_id
                ? `${lot.supplier_name} · ${lot.invoice_number}${delivery?.data?.receiver ? ` · by ${delivery.data.receiver.display_name}` : ''}`
                : (p?.operator?.display_name ?? '—')
            }
          />
        </dl>
        <div className="mt-6 max-w-xl">
          <div className="flex justify-between text-sm">
            <span className="font-bold">{formatQty(lot.remaining, lot.unit)} left</span>
            <span className="text-ink-soft">of {formatQty(lot.quantity, lot.unit)}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-rule" aria-hidden>
            <div className="h-full bg-ink" style={{ width: `${usedShare * 100}%` }} />
          </div>
        </div>
        {p && (p.bake_minutes || p.batches || p.comment) && (
          <p className="mt-4 text-sm text-ink-soft">
            {p.batches ? `${p.batches} batch${Number(p.batches) > 1 ? 'es' : ''}. ` : ''}
            {p.bake_minutes ? `Baked ${p.bake_minutes} min at ${p.bake_temperature_f}°F. ` : ''}
            {p.comment}
          </p>
        )}
      </header>

      <section aria-labelledby="recall" className="mt-10">
        <h2 id="recall" className="font-display text-3xl">Where it went</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {downstream.length === 0
            ? 'Not used in any production yet.'
            : packed.length > 0
              ? `If this lot is recalled: ${packedUnits.toLocaleString('en-US')} packed units in ${packed.length} lot${packed.length > 1 ? 's' : ''} — ${products.join(', ')}.`
              : `Used in ${downstream.length} lot${downstream.length > 1 ? 's' : ''}, none packed yet.`}
        </p>
        <TraceColumns rows={downstream} direct={usedIn} directLabel="took" />
      </section>

      <section aria-labelledby="origin" className="mt-14">
        <h2 id="origin" className="font-display text-3xl">What it is made of</h2>
        {upstream.length === 0 ? (
          <p className="mt-2 text-ink-soft">Delivered as is: this is where the trace starts.</p>
        ) : (
          <TraceColumns rows={upstream} direct={madeFrom} directLabel="used" />
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}

// One column per stage, in the order lots move through the bakery.
function TraceColumns({ rows, direct, directLabel }: { rows: TraceRow[]; direct: Map<string, Use>; directLabel: string }) {
  const columns = STAGES.map((stage) => ({ ...stage, rows: rows.filter((r) => r.kind === stage.kind) })).filter((c) => c.rows.length > 0);
  if (columns.length === 0) return null;

  return (
    // One row on tablets and up, so the trace reads left to right like the bakery flow.
    <div
      className="mt-6 grid gap-6 md:[grid-template-columns:var(--cols)]"
      style={{ '--cols': `repeat(${columns.length}, minmax(0, 1fr))` } as React.CSSProperties}
    >
      {columns.map((column, ci) => (
        <div key={column.kind} className="rise" style={{ animationDelay: `${ci * 90}ms` }}>
          <h3 className="eyebrow flex items-center gap-2 border-b border-rule pb-2">
            {ci > 0 && <span aria-hidden className="text-ink">→</span>}
            {column.label}
            <span className="font-mono text-ink">{column.rows.length}</span>
          </h3>
          <ul className="mt-3 space-y-3">
            {column.rows.map((row) => {
              const link = direct.get(row.lot_id);
              return (
                <li key={row.lot_id}>
                  <LotTag id={row.lot_id} code={row.lot_code} kind={row.kind} />
                  <p className="mt-1 text-sm">{row.item_name}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(row.made_on)}
                    {link ? ` · ${directLabel} ${formatQty(link.quantity, link.unit)}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
