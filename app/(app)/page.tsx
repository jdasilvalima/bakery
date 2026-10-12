import Link from 'next/link';
import { LotTag } from '@/components/lot-tag';
import { requireUser } from '@/lib/auth';
import { addDays, bakeryToday, formatDate, formatQty, stageLabel } from '@/lib/format';

const ACTIONS = [
  { href: '/receive', stage: 'raw_material', title: 'Receive', text: 'Log a delivery and its lots' },
  { href: '/produce?step=wip_batch', stage: 'wip', title: 'Mix', text: 'Dough, fillings, toppings' },
  { href: '/produce?step=pie_bake', stage: 'finished', title: 'Bake', text: 'Pies, with time and temperature' },
  { href: '/produce?step=packaging', stage: 'packed', title: 'Pack', text: 'Box and label baked goods' },
];

export default async function TodayPage() {
  const { supabase, staff } = await requireUser();
  const today = bakeryToday();

  const [ccp, expiring, latest] = await Promise.all([
    supabase
      .from('bake_ccp_checks')
      .select('production_id, lot_code, product_name, produced_on, bake_minutes, min_bake_minutes, bake_temperature_f, min_bake_temperature_f, missing_record')
      .or('deviation.eq.true,missing_record.eq.true')
      .gte('produced_on', addDays(today, -14))
      .order('produced_on', { ascending: false }),
    // Only stock still used in production: packed goods leave the bakery.
    supabase
      .from('lot_details')
      .select('id, lot_code, kind, item_name, remaining, unit, expires_on')
      .in('kind', ['raw_material', 'wip'])
      .gt('remaining', 0)
      .lte('expires_on', addDays(today, 3))
      .order('expires_on'),
    supabase
      .from('lot_details')
      .select('id, lot_code, kind, item_name, quantity, unit, made_on')
      .order('made_on', { ascending: false })
      .order('lot_code', { ascending: false })
      .limit(8),
  ]);

  const alerts = (ccp.data?.length ?? 0) + (expiring.data?.length ?? 0);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="rise">
        <p className="eyebrow">
          {new Date(`${today}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="mt-2 font-display text-5xl leading-none sm:text-6xl">Today at the bakery</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Hello {staff?.display_name}.{' '}
          {alerts === 0 ? 'Nothing needs attention.' : `${alerts} ${alerts === 1 ? 'thing needs' : 'things need'} attention.`}
        </p>
      </header>

      <section aria-label="Record" className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.map((action, i) => (
          <Link
            key={action.href}
            href={action.href}
            className="rise group relative overflow-hidden rounded-md border border-rule bg-paper p-5 transition hover:-translate-y-0.5 hover:border-ink"
            style={{ animationDelay: `${80 + i * 70}ms` }}
          >
            <span className="lot-tag absolute top-4 right-0 !py-0.5 text-[0.65rem] opacity-90" data-stage={action.stage} aria-hidden>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="block font-display text-3xl">{action.title}</span>
            <span className="mt-1 block text-sm text-ink-soft">{action.text}</span>
            <span className="mt-4 block text-sm font-bold text-crust group-hover:underline">Start →</span>
          </Link>
        ))}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section aria-labelledby="attention">
          <h2 id="attention" className="eyebrow">Needs attention</h2>
          <ul className="mt-4 space-y-3">
            {ccp.data?.map((check) => (
              <li key={check.production_id} className="rounded-md border-l-4 border-alert bg-alert-soft px-4 py-3">
                <p className="font-bold text-alert">
                  {check.missing_record ? 'Bake not recorded' : 'Bake below critical limit'} · {check.product_name}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-mono">{check.lot_code}</span> on {formatDate(check.produced_on)}:{' '}
                  {check.bake_minutes ?? '?'} min at {check.bake_temperature_f ?? '?'}°F (minimum {check.min_bake_minutes} min at{' '}
                  {check.min_bake_temperature_f}°F). Hold the lot and decide on corrective action.
                </p>
              </li>
            ))}
            {expiring.data?.map((lot) => {
              const expired = lot.expires_on! < today;
              return (
                <li key={lot.id} className="flex items-center justify-between gap-3 rounded-md border border-rule bg-paper px-4 py-3">
                  <div>
                    <p className="font-bold">{lot.item_name}</p>
                    <p className="text-sm text-ink-soft">
                      {formatQty(lot.remaining, lot.unit)} left ·{' '}
                      <span className={expired ? 'font-bold text-alert' : ''}>
                        {expired ? 'expired' : 'expires'} {formatDate(lot.expires_on)}
                      </span>
                    </p>
                  </div>
                  <LotTag id={lot.id!} code={lot.lot_code!} kind={lot.kind!} />
                </li>
              );
            })}
            {alerts === 0 && <li className="text-ink-soft">No bake deviations and no stock expiring in the next 3 days.</li>}
          </ul>
        </section>

        <section aria-labelledby="latest">
          <div className="flex items-baseline justify-between">
            <h2 id="latest" className="eyebrow">Latest lots</h2>
            <Link href="/lots" className="text-sm font-bold text-crust hover:underline">All lots →</Link>
          </div>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {latest.data?.map((lot) => (
              <li key={lot.id} className="flex items-center gap-4 py-3">
                <LotTag id={lot.id!} code={lot.lot_code!} kind={lot.kind!} />
                <span className="min-w-0 flex-1 truncate">{lot.item_name}</span>
                <span className="hidden text-sm text-ink-soft sm:inline">{stageLabel(lot.kind!)}</span>
                <span className="w-24 text-right text-sm text-ink-soft">{formatDate(lot.made_on)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
