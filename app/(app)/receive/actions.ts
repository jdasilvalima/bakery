'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

const Delivery = z.object({
  supplier_id: z.uuid('Choose a supplier'),
  invoice_number: z.string().trim().min(1, 'Invoice number is required'),
  received_on: z.iso.date('Choose a date'),
  received_by: z.uuid('Choose who received it'),
  lines: z
    .array(
      z.object({
        material_id: z.uuid('Choose an item on every line'),
        lot_code: z.string().trim().min(1, 'Every line needs the lot number printed on the package'),
        packages: z.coerce.number().positive('Packages must be more than 0'),
        expires_on: z.union([z.iso.date(), z.literal('')]).transform((v) => v || null),
      }),
    )
    .min(1, 'Add at least one line'),
});

export type ReceiveState = { error?: string };

export async function receiveDelivery(_prev: ReceiveState, formData: FormData): Promise<ReceiveState> {
  const { supabase } = await requireUser();

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload')));
  } catch {
    return { error: 'The form could not be read. Reload the page and try again.' };
  }
  const parsed = Delivery.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // The database validates the whole delivery and records it in one transaction.
  const { error } = await supabase.rpc('record_delivery', {
    p_supplier_id: d.supplier_id,
    p_invoice_number: d.invoice_number,
    p_received_on: d.received_on,
    p_received_by: d.received_by,
    p_lines: d.lines,
  });
  if (error) {
    return {
      error: error.code === '23505' ? `Invoice ${d.invoice_number} was already recorded for this supplier.` : error.message,
    };
  }
  redirect(`/lots?received=${encodeURIComponent(d.invoice_number)}`);
}
