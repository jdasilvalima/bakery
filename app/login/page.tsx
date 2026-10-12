import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

const SAMPLE_TAGS = [
  { code: 'PF-26271', kind: 'raw_material', label: 'Pastry flour' },
  { code: 'WIP-20261001-01', kind: 'wip', label: 'Pie dough' },
  { code: 'FIN-20261002-01', kind: 'finished', label: 'Cherry pie 9"' },
  { code: 'PCK-20261003-01', kind: 'packed', label: '118 boxed' },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-rule bg-ink px-14 py-16 text-flour lg:flex lg:flex-col lg:justify-between">
        <p className="eyebrow !text-stage-raw">Bakery traceability</p>
        <div>
          <h1 className="font-display text-6xl leading-[0.95]">
            Every lot,
            <br />
            from the flour bag
            <br />
            to the pie box.
          </h1>
          <ol className="mt-12 space-y-3">
            {SAMPLE_TAGS.map((tag, i) => (
              <li key={tag.code} className="rise flex items-center gap-4" style={{ animationDelay: `${150 + i * 110}ms`, marginLeft: `${i * 1.6}rem` }}>
                <span className="lot-tag text-base text-ink" data-stage={tag.kind}>{tag.code}</span>
                <span className="text-sm text-stage-wip/80">{tag.label}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="max-w-sm text-sm text-stage-wip/70">
          Receive, mix, bake and pack — and answer a recall in one search.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="eyebrow lg:hidden">Bakery traceability</p>
          <h2 className="mt-2 font-display text-4xl">Sign in</h2>
          <p className="mt-2 mb-8 text-ink-soft">Accounts are created by the bakery owner.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
