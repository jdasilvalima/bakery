'use client';

import { useActionState, useRef, useState } from 'react';
import { formatDate, formatQty, type LotKind } from '@/lib/format';
import { recordProduction, type ProduceState } from './actions';

export type Step = 'wip_batch' | 'pie_bake' | 'cookie_deposit' | 'packaging';

type Recipe = {
  id: string;
  version_label: string;
  recipe: { name: string; category: string } | null;
  lines: { quantity_per_batch: number; unit: string; ingredient: { id: string; name: string; lot_tracked: boolean } | null }[];
};
type Product = { id: string; name: string; category: string; min_bake_minutes: number | null; min_bake_temperature_f: number | null };
type Lot = {
  id: string | null;
  lot_code: string | null;
  kind: LotKind | null;
  item_name: string | null;
  ingredient_id: string | null;
  product_id: string | null;
  remaining: number | null;
  unit: string | null;
  expires_on: string | null;
};
type InputRow = { key: number; lot_id: string; quantity: string; unit: string; ingredient_id?: string };

const STEPS: { step: Step; title: string; text: string; stage: LotKind }[] = [
  { step: 'wip_batch', title: 'Mix', text: 'Dough, filling or topping from a recipe', stage: 'wip' },
  { step: 'pie_bake', title: 'Bake', text: 'Assemble and bake pies', stage: 'finished' },
  { step: 'cookie_deposit', title: 'Cookies', text: 'Deposit and bake cookies', stage: 'finished' },
  { step: 'packaging', title: 'Pack', text: 'Box and label baked goods', stage: 'packed' },
];

const LB_PER: Record<string, number> = { lb: 1, oz: 1 / 16, kg: 2.20462262185, g: 0.00220462262185 };
const unitsFor = (lotUnit: string | null) => (lotUnit === 'pc' ? ['pc'] : ['lb', 'oz', 'kg', 'g']);
const round = (n: number) => Math.round(n * 1000) / 1000;

function lotLabel(lot: Lot) {
  const expiry = lot.expires_on ? ` · exp ${formatDate(lot.expires_on)}` : '';
  return `${lot.lot_code} — ${lot.item_name} · ${formatQty(lot.remaining, lot.unit)} left${expiry}`;
}

export function ProduceForm({
  initialStep,
  recipes,
  products,
  staff,
  lots,
  defaultOperator,
  today,
}: {
  initialStep: Step;
  recipes: Recipe[];
  products: Product[];
  staff: { id: string; display_name: string }[];
  lots: Lot[];
  defaultOperator: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ProduceState, FormData>(recordProduction, {});
  const [step, setStep] = useState<Step>(initialStep);
  const [producedOn, setProducedOn] = useState(today);
  const [operatorId, setOperatorId] = useState(defaultOperator);
  const [comment, setComment] = useState('');

  const [recipeId, setRecipeId] = useState('');
  const [batches, setBatches] = useState('1');
  const [outputLbs, setOutputLbs] = useState('');
  const [expiresOn, setExpiresOn] = useState('');

  const [productId, setProductId] = useState('');
  const [units, setUnits] = useState('');
  const [bakeMinutes, setBakeMinutes] = useState('');
  const [bakeTemp, setBakeTemp] = useState('');
  const [waste, setWaste] = useState('');

  const [rows, setRows] = useState<InputRow[]>(() =>
    initialStep === 'wip_batch' ? [] : [{ key: 0, lot_id: '', quantity: '', unit: 'pc' }],
  );
  const nextKey = useRef(1);
  const newRow = (patch: Partial<InputRow> = {}): InputRow => ({ key: nextKey.current++, lot_id: '', quantity: '', unit: 'lb', ...patch });

  // Heaviest ingredient first, the way bakers read a formula.
  const byWeight = (lines: Recipe['lines']) =>
    [...lines].sort((a, b) => b.quantity_per_batch * (LB_PER[b.unit] ?? 1) - a.quantity_per_batch * (LB_PER[a.unit] ?? 1));
  const recipe = recipes.find((r) => r.id === recipeId);
  const product = products.find((p) => p.id === productId);
  const lotById = new Map(lots.map((l) => [l.id!, l]));
  // Expired stock cannot be used (the database refuses it too).
  const usable = lots.filter((l) => !l.expires_on || l.expires_on >= producedOn);

  // Suggest lots for each tracked ingredient, first expiring first, sized for
  // the batches. When the oldest lot is short, the rest comes from the next one.
  function suggestRows(line: Recipe['lines'][number], batchCount: number): InputRow[] {
    const ingredientId = line.ingredient!.id;
    const candidates = usable.filter((l) => l.kind === 'raw_material' && l.ingredient_id === ingredientId);
    const needed = line.quantity_per_batch * batchCount;
    const neededLb = needed * (LB_PER[line.unit] ?? 1);
    const first = candidates[0];

    if (!first || !batchCount || first.unit !== 'lb' || Number(first.remaining) >= neededLb) {
      return [newRow({ ingredient_id: ingredientId, lot_id: first?.id ?? '', quantity: batchCount ? String(round(needed)) : '', unit: line.unit })];
    }
    const rows: InputRow[] = [];
    let left = neededLb;
    for (const lot of candidates) {
      if (left <= 0) break;
      const take = Math.min(Number(lot.remaining), left);
      rows.push(newRow({ ingredient_id: ingredientId, lot_id: lot.id!, quantity: String(round(take)), unit: 'lb' }));
      left -= take;
    }
    return rows;
  }

  function applyRecipe(id: string, batchCount: string) {
    const chosen = recipes.find((r) => r.id === id);
    const n = Number(batchCount) || 0;
    if (!chosen) {
      setRows([]);
      return;
    }
    setRows(
      byWeight(chosen.lines)
        .filter((line) => line.ingredient?.lot_tracked)
        .flatMap((line) => suggestRows(line, n)),
    );
    const total = chosen.lines.reduce((sum, line) => sum + line.quantity_per_batch * n * (LB_PER[line.unit] ?? 0), 0);
    setOutputLbs(total ? String(round(total)) : '');
  }

  function changeStep(next: Step) {
    setStep(next);
    setRows(next === 'wip_batch' ? [] : [newRow({ unit: 'pc' })]);
    setRecipeId('');
    setProductId('');
    window.history.replaceState(null, '', `?step=${next}`);
  }

  function updateRow(key: number, patch: Partial<InputRow>) {
    setRows((all) =>
      all.map((row) => {
        if (row.key !== key) return row;
        const updated = { ...row, ...patch };
        // Keep the unit compatible with the chosen lot.
        if (patch.lot_id) {
          const lot = lotById.get(patch.lot_id);
          if (lot && !unitsFor(lot.unit).includes(updated.unit)) updated.unit = lot.unit ?? 'lb';
        }
        return updated;
      }),
    );
  }

  function optionsFor(row: InputRow) {
    if (step === 'wip_batch') return [{ label: 'Lots in stock', lots: usable.filter((l) => l.kind === 'raw_material' && l.ingredient_id === row.ingredient_id) }];
    if (step === 'packaging') {
      return [
        { label: 'Baked lots', lots: usable.filter((l) => l.kind === 'finished' && (!productId || l.product_id === productId)) },
        { label: 'Packaging', lots: usable.filter((l) => l.kind === 'packaging') },
      ];
    }
    return [
      { label: 'Batches', lots: usable.filter((l) => l.kind === 'wip') },
      { label: 'Ingredients', lots: usable.filter((l) => l.kind === 'raw_material') },
      { label: 'Packaging', lots: usable.filter((l) => l.kind === 'packaging') },
    ];
  }

  const isWip = step === 'wip_batch';
  const belowLimit =
    step !== 'packaging' &&
    product?.min_bake_minutes != null &&
    ((bakeMinutes !== '' && Number(bakeMinutes) < product.min_bake_minutes) ||
      (bakeTemp !== '' && product.min_bake_temperature_f != null && Number(bakeTemp) < product.min_bake_temperature_f));

  const payload = JSON.stringify({
    kind: step,
    produced_on: producedOn,
    operator_id: operatorId,
    output: isWip
      ? { recipe_version_id: recipeId || undefined, batches, quantity: outputLbs, unit: 'lb', expires_on: expiresOn }
      : { product_id: productId || undefined, quantity: units, unit: 'pc' },
    inputs: rows.filter((r) => r.lot_id || r.quantity).map(({ lot_id, quantity, unit }) => ({ lot_id, quantity, unit })),
    details: isWip
      ? { comment }
      : step === 'packaging'
        ? { comment }
        : { bake_minutes: bakeMinutes, bake_temperature_f: bakeTemp, waste_lbs: waste, comment },
  });

  const currentStep = STEPS.find((s) => s.step === step)!;

  return (
    <form action={formAction} className="mt-10">
      <input type="hidden" name="payload" value={payload} />

      <div role="tablist" aria-label="Production step" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s) => (
          <button
            key={s.step}
            type="button"
            role="tab"
            aria-selected={step === s.step}
            onClick={() => changeStep(s.step)}
            className={`rounded-md border-2 px-4 py-3 text-left transition ${
              step === s.step ? 'border-ink bg-paper' : 'border-transparent bg-rule/40 hover:border-rule'
            }`}
          >
            <span className="flex items-center gap-2 font-display text-2xl">
              <span className="lot-tag h-3.5 w-6 !p-0" data-stage={s.stage} aria-hidden />
              {s.title}
            </span>
            <span className="mt-0.5 block text-sm text-ink-soft">{s.text}</span>
          </button>
        ))}
      </div>

      <fieldset className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">{currentStep.title}</legend>
        <div>
          <label htmlFor="produced_on" className="field-label">Date</label>
          <input id="produced_on" type="date" className="field" value={producedOn} max={today} onChange={(e) => setProducedOn(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="operator" className="field-label">Operator</label>
          <select id="operator" className="field" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} required>
            <option value="">Choose…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </select>
        </div>

        {isWip ? (
          <>
            <div>
              <label htmlFor="recipe" className="field-label">Recipe</label>
              <select
                id="recipe"
                className="field"
                value={recipeId}
                onChange={(e) => {
                  setRecipeId(e.target.value);
                  applyRecipe(e.target.value, batches);
                }}
                required
              >
                <option value="">Choose…</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.recipe?.name} ({r.version_label})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="batches" className="field-label">Batches</label>
              <input
                id="batches"
                type="number"
                min="0.25"
                step="0.25"
                inputMode="decimal"
                className="field"
                value={batches}
                onChange={(e) => {
                  setBatches(e.target.value);
                  applyRecipe(recipeId, e.target.value);
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="output" className="field-label">Batch weight (lb)</label>
              <input id="output" type="number" min="0.01" step="any" inputMode="decimal" className="field" value={outputLbs} onChange={(e) => setOutputLbs(e.target.value)} required />
              <p className="mt-1 text-xs text-ink-soft">Pre-filled from the recipe. Adjust to the real yield.</p>
            </div>
            <div>
              <label htmlFor="expires" className="field-label">Use by</label>
              <input id="expires" type="date" className="field" value={expiresOn} min={producedOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="product" className="field-label">Product</label>
              <select id="product" className="field" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                <option value="">Choose…</option>
                {products
                  .filter((p) => (step === 'pie_bake' ? p.category === 'pie' : step === 'cookie_deposit' ? p.category === 'cookie' : true))
                  .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="units" className="field-label">{step === 'packaging' ? 'Units packed' : 'Units made'}</label>
              <input id="units" type="number" min="1" step="1" inputMode="numeric" className="field" value={units} onChange={(e) => setUnits(e.target.value)} required />
            </div>
          </>
        )}
      </fieldset>

      {(step === 'pie_bake' || step === 'cookie_deposit') && (
        <fieldset className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">Bake record</legend>
          <div>
            <label htmlFor="minutes" className="field-label">Bake time (min)</label>
            <input id="minutes" type="number" min="1" inputMode="numeric" className="field" value={bakeMinutes} onChange={(e) => setBakeMinutes(e.target.value)} required={step === 'pie_bake'} />
          </div>
          <div>
            <label htmlFor="temp" className="field-label">Oven (°F)</label>
            <input id="temp" type="number" min="1" inputMode="numeric" className="field" value={bakeTemp} onChange={(e) => setBakeTemp(e.target.value)} required={step === 'pie_bake'} />
          </div>
          {step === 'cookie_deposit' && (
            <div>
              <label htmlFor="waste" className="field-label">Dough wasted (lb)</label>
              <input id="waste" type="number" min="0" step="any" inputMode="decimal" className="field" value={waste} onChange={(e) => setWaste(e.target.value)} />
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-2 self-center">
            {product?.min_bake_minutes != null && (
              <p className={`rounded-md px-3 py-2 text-sm ${belowLimit ? 'bg-alert-soft font-bold text-alert' : 'text-ink-soft'}`}>
                Critical limit: at least {product.min_bake_minutes} min at {product.min_bake_temperature_f}°F.
                {belowLimit ? ' This bake will be flagged for corrective action.' : ''}
              </p>
            )}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-10">
        <legend className="eyebrow">Lots used</legend>

        {isWip && !recipe && <p className="mt-3 text-ink-soft">Choose a recipe: the lots to use will be suggested, oldest first.</p>}

        {isWip && recipe && (
          <div className="mt-3 space-y-4">
            {byWeight(recipe.lines).map((line) => {
              const ingredient = line.ingredient!;
              const needed = round(line.quantity_per_batch * (Number(batches) || 0));
              if (!ingredient.lot_tracked) {
                return (
                  <p key={ingredient.id} className="rounded-md border border-dashed border-rule px-4 py-3 text-ink-soft">
                    <span className="font-bold text-ink">{ingredient.name}</span> · {formatQty(needed, line.unit)} · not lot-tracked
                  </p>
                );
              }
              const ingredientRows = rows.filter((r) => r.ingredient_id === ingredient.id);
              const shortLb =
                needed * (LB_PER[line.unit] ?? 1) -
                ingredientRows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (LB_PER[r.unit] ?? 1), 0);
              return (
                <div key={ingredient.id} className="rounded-md border border-rule bg-paper p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold">{ingredient.name}</p>
                    <p className="text-sm text-ink-soft">
                      Recipe: {formatQty(line.quantity_per_batch, line.unit)} × {batches || 0} = <span className="font-bold text-ink">{formatQty(needed, line.unit)}</span>
                    </p>
                  </div>
                  {shortLb > 0.001 && (
                    <p className="mt-1 text-sm font-bold text-alert">
                      {formatQty(round(shortLb), 'lb')} short of the recipe. Add a lot or adjust the batch.
                    </p>
                  )}
                  {ingredientRows.map((row) => (
                    <InputLine key={row.key} row={row} groups={optionsFor(row)} lot={lotById.get(row.lot_id)} onChange={updateRow} onRemove={ingredientRows.length > 1 ? () => setRows((all) => all.filter((r) => r.key !== row.key)) : undefined} />
                  ))}
                  <button
                    type="button"
                    className="mt-2 text-sm font-bold text-crust hover:underline"
                    onClick={() => setRows((all) => [...all, newRow({ ingredient_id: ingredient.id, unit: line.unit })])}
                  >
                    + Split across another lot
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {!isWip && (
          <div className="mt-3 space-y-3">
            {rows.map((row) => (
              <div key={row.key} className="rounded-md border border-rule bg-paper p-4">
                <InputLine row={row} groups={optionsFor(row)} lot={lotById.get(row.lot_id)} onChange={updateRow} onRemove={rows.length > 1 ? () => setRows((all) => all.filter((r) => r.key !== row.key)) : undefined} />
              </div>
            ))}
            <button type="button" className="btn btn-ghost" onClick={() => setRows((all) => [...all, newRow({ unit: 'pc' })])}>
              + Add a lot
            </button>
          </div>
        )}
      </fieldset>

      <div className="mt-8">
        <label htmlFor="comment" className="field-label">Comment</label>
        <input id="comment" className="field" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional: rejects, deviations, corrective action" />
      </div>

      {state.error && (
        <p role="alert" className="mt-8 rounded-md border-l-4 border-alert bg-alert-soft px-4 py-3 text-alert">
          {state.error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t-2 border-ink pt-6">
        <button type="submit" disabled={pending} className="btn btn-primary min-w-56">
          {pending ? 'Recording…' : `Record ${currentStep.title.toLowerCase()} and create lot`}
        </button>
        <p className="text-sm text-ink-soft">The lot code is generated automatically.</p>
      </div>
    </form>
  );
}

function InputLine({
  row,
  groups,
  lot,
  onChange,
  onRemove,
}: {
  row: InputRow;
  groups: { label: string; lots: Lot[] }[];
  lot: Lot | undefined;
  onChange: (key: number, patch: Partial<InputRow>) => void;
  onRemove?: () => void;
}) {
  const over = lot && row.quantity !== '' && lot.remaining != null && lot.unit === row.unit && Number(row.quantity) > Number(lot.remaining);
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem_6rem_auto] sm:items-start">
      <div>
        <label htmlFor={`lot-${row.key}`} className="sr-only">Lot</label>
        <select id={`lot-${row.key}`} className="field font-mono text-[0.95rem]" value={row.lot_id} onChange={(e) => onChange(row.key, { lot_id: e.target.value })} required>
          <option value="">{groups.every((g) => g.lots.length === 0) ? 'No lot in stock' : 'Choose a lot…'}</option>
          {groups.map((g) =>
            g.lots.length ? (
              <optgroup key={g.label} label={g.label}>
                {g.lots.map((l) => <option key={l.id} value={l.id!}>{lotLabel(l)}</option>)}
              </optgroup>
            ) : null,
          )}
        </select>
        {over && <p className="mt-1 text-sm font-bold text-alert">Only {formatQty(lot.remaining, lot.unit)} left in this lot.</p>}
      </div>
      <div>
        <label htmlFor={`qty-${row.key}`} className="sr-only">Quantity</label>
        <input id={`qty-${row.key}`} type="number" min="0.001" step="any" inputMode="decimal" className="field" value={row.quantity} onChange={(e) => onChange(row.key, { quantity: e.target.value })} required placeholder="Qty" />
      </div>
      <div>
        <label htmlFor={`unit-${row.key}`} className="sr-only">Unit</label>
        <select id={`unit-${row.key}`} className="field" value={row.unit} onChange={(e) => onChange(row.key, { unit: e.target.value })}>
          {unitsFor(lot?.unit ?? (row.unit === 'pc' ? 'pc' : 'lb')).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {onRemove ? (
        <button type="button" onClick={onRemove} className="btn btn-ghost" aria-label="Remove this lot">✕</button>
      ) : (
        <span className="hidden sm:block sm:w-12" />
      )}
    </div>
  );
}
