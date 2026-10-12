import type { Metadata } from 'next';
import Link from 'next/link';
import { LotTag } from '@/components/lot-tag';
import { requireUser } from '@/lib/auth';
import { bakeryToday, formatDate, formatQty, STAGES, type LotKind } from '@/lib/format';

export const metadata: Metadata = { title: 'Lots' };

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; received?: string }>;
}) {
  const { q = '', stage, received } = await searchParams;
  const { supabase } = await requireUser();
  const today = bakeryToday();

  let query = supabase
    .from('lot_details')
    .select('id, lot_code, kind, item_name, quantity, remaining, unit, made_on, expires_on, supplier_name, invoice_number')
    .order('made_on', { ascending: false })
    .order('lot_code', { ascending: false })
    .limit(200);

  // PostgREST filter syntax uses , and () as separators.
  const search = q.replace(/[,()*%]/g, ' ').trim();
  if (search) query = query.or(`lot_code.ilike.%${search}%,item_name.ilike.%${search}%,invoice_number.ilike.%${search}%`);
  if (stage && STAGES.some((s) => s.kind === stage)) query = query.eq('kind', stage as LotKind);

  const { data: lots, error } = await query;

  const filterHref = (kind?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (kind) params.set('stage', kind);
    const qs = params.toString();
    return qs ? `/lots?${qs}` : '/lots';
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Traceability</p>
          <h1 className="mt-2 font-display text-5xl leading-none">Lots</h1>
        </div>
        <form role="search" className="flex w-full gap-2 sm:w-auto">
          {stage && <input type="hidden" name="stage" value={stage} />}
          <label htmlFor="q" className="sr-only">Search lots</label>
          <input id="q" name="q" defaultValue={search} placeholder="Lot code, item or invoice" className="field sm:w-80" />
          <button className="btn btn-ghost">Search</button>
        </form>
      </header>

      {received && (
        <p role="status" className="rise mt-6 rounded-md border-l-4 border-ok bg-paper px-4 py-3">
          Delivery <span className="font-mono font-bold">{received}</span> recorded. Its lots are at the top of the list.
        </p>
      )}

      <nav aria-label="Filter by stage" className="mt-8 flex flex-wrap gap-2">
        <Link href={filterHref()} className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${!stage ? 'border-ink bg-ink text-flour' : 'border-rule'}`}>
          All
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s.kind}
            href={filterHref(s.kind)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${stage === s.kind ? 'border-ink bg-ink text-flour' : 'border-rule'}`}
          >
            <span className="lot-tag !p-0 !pl-2.5 h-3 w-5" data-stage={s.kind} aria-hidden />
            {s.label}
          </Link>
        ))}
      </nav>

      {error && <p className="mt-6 text-alert">Could not load lots: {error.message}</p>}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="eyebrow border-b-2 border-ink">
              <th className="py-3 pr-4 font-bold">Lot</th>
              <th className="py-3 pr-4 font-bold">Item</th>
              <th className="hidden py-3 pr-4 font-bold xl:table-cell">Source</th>
              <th className="py-3 pr-4 font-bold">Made / received</th>
              <th className="py-3 pr-4 text-right font-bold">Left</th>
              <th className="py-3 font-bold">Expires</th>
            </tr>
          </thead>
          <tbody>
            {lots?.map((lot) => {
              const expired = lot.expires_on && lot.expires_on < today && lot.remaining! > 0 && (lot.kind === 'raw_material' || lot.kind === 'wip');
              return (
                <tr key={lot.id} className={`border-b border-rule ${received && lot.invoice_number === received ? 'bg-stage-wip/50' : ''}`}>
                  <td className="py-3 pr-4"><LotTag id={lot.id!} code={lot.lot_code!} kind={lot.kind!} /></td>
                  <td className="py-3 pr-4">{lot.item_name}</td>
                  <td className="hidden py-3 pr-4 text-sm text-ink-soft xl:table-cell">
                    {lot.supplier_name ? `${lot.supplier_name} · ${lot.invoice_number}` : 'Made in house'}
                  </td>
                  <td className="py-3 pr-4 text-sm">{formatDate(lot.made_on)}</td>
                  <td className="py-3 pr-4 text-right font-mono text-sm">
                    {formatQty(lot.remaining, lot.unit)}
                    <span className="text-ink-soft"> / {Number(lot.quantity).toLocaleString('en-US')}</span>
                  </td>
                  <td className={`py-3 text-sm ${expired ? 'font-bold text-alert' : ''}`}>{formatDate(lot.expires_on)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lots?.length === 0 && <p className="py-10 text-center text-ink-soft">No lots match.</p>}
      </div>
    </div>
  );
}
