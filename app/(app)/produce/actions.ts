'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const optionalNumber = z.union([z.coerce.number().positive(), z.literal('')]).transform((v) => (v === '' ? undefined : v));

const Production = z.object({
  kind: z.enum(['wip_batch', 'pie_bake', 'cookie_deposit', 'packaging']),
  produced_on: z.iso.date('Choose a date'),
  operator_id: z.uuid('Choose the operator'),
  output: z.object({
    recipe_version_id: z.uuid().optional(),
    product_id: z.uuid().optional(),
    batches: optionalNumber.optional(),
    quantity: z.coerce.number().positive('Enter how much was made'),
    unit: z.enum(['lb', 'oz', 'kg', 'g', 'pc']),
    expires_on: z.union([z.iso.date(), z.literal('')]).transform((v) => v || undefined).optional(),
  }),
  inputs: z
    .array(
      z.object({
        lot_id: z.uuid('Choose a lot on every input line'),
        quantity: z.coerce.number().positive('Every input needs a quantity'),
        unit: z.enum(['lb', 'oz', 'kg', 'g', 'pc']),
      }),
    )
    .min(1, 'Add at least one input lot'),
  details: z.object({
    bake_minutes: optionalNumber.optional(),
    bake_temperature_f: optionalNumber.optional(),
    waste_lbs: z.union([z.coerce.number().min(0), z.literal('')]).transform((v) => (v === '' ? undefined : v)).optional(),
    comment: z.string().trim().max(500).optional(),
  }),
});

export type ProduceState = { error?: string };

export async function recordProduction(_prev: ProduceState, formData: FormData): Promise<ProduceState> {
  const { supabase } = await requireUser();

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload')));
  } catch {
    return { error: 'The form could not be read. Reload the page and try again.' };
  }
  const parsed = Production.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;

  if (p.kind === 'wip_batch' ? !p.output.recipe_version_id : !p.output.product_id) {
    return { error: p.kind === 'wip_batch' ? 'Choose a recipe' : 'Choose a product' };
  }

  // The database checks every input (stock left, units, recipe ingredients)
  // and records the production and its new lot in one transaction.
  const { data: lotId, error } = await supabase.rpc('record_production', {
    p_kind: p.kind,
    p_produced_on: p.produced_on,
    p_operator_id: p.operator_id,
    p_output: p.output,
    p_inputs: p.inputs,
    p_details: p.details,
  });
  if (error) return { error: error.message };
  redirect(`/lots/${lotId}?created=1`);
}
