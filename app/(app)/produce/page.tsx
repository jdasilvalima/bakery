import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { bakeryToday } from '@/lib/format';
import { ProduceForm, type Step } from './produce-form';

export const metadata: Metadata = { title: 'Record production' };

const STEPS: Step[] = ['wip_batch', 'pie_bake', 'cookie_deposit', 'packaging'];

export default async function ProducePage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  const { supabase, staff } = await requireUser();

  const [recipes, products, people, lots] = await Promise.all([
    supabase
      .from('recipe_versions')
      .select('id, version_label, recipe:recipes(name, category), lines:recipe_lines(quantity_per_batch, unit, ingredient:ingredients(id, name, lot_tracked))')
      .is('retired_at', null),
    supabase.from('products').select('id, name, category, min_bake_minutes, min_bake_temperature_f').eq('active', true).order('name'),
    supabase.from('staff').select('id, display_name').eq('active', true).order('display_name'),
    // Oldest expiry first: the form suggests lots first in, first out.
    supabase
      .from('lot_details')
      .select('id, lot_code, kind, item_name, ingredient_id, product_id, remaining, unit, made_on, expires_on')
      .gt('remaining', 0)
      .order('expires_on', { ascending: true, nullsFirst: false })
      .order('made_on', { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Steps 2–4 · Production</p>
      <h1 className="mt-2 font-display text-5xl leading-none">Record production</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Pick the lots you actually used. Each production gets its own lot code, so it can be traced later.
      </p>
      <ProduceForm
        initialStep={STEPS.includes(step as Step) ? (step as Step) : 'wip_batch'}
        recipes={(recipes.data ?? []).sort((a, b) => (a.recipe?.name ?? '').localeCompare(b.recipe?.name ?? ''))}
        products={products.data ?? []}
        staff={people.data ?? []}
        lots={lots.data ?? []}
        defaultOperator={staff?.id ?? ''}
        today={bakeryToday()}
      />
    </div>
  );
}
