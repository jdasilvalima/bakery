import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { bakeryToday } from '@/lib/format';
import { ReceiveForm } from './receive-form';

export const metadata: Metadata = { title: 'Receive a delivery' };

export default async function ReceivePage() {
  const { supabase, staff } = await requireUser();

  const [suppliers, materials, people] = await Promise.all([
    supabase.from('suppliers').select('id, name').eq('active', true).order('name'),
    supabase
      .from('materials')
      .select('id, kind, code, name, package_unit, qty_per_package, base_unit')
      .eq('active', true)
      .order('kind')
      .order('name'),
    supabase.from('staff').select('id, display_name').eq('active', true).order('display_name'),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Step 1 · Receiving</p>
      <h1 className="mt-2 font-display text-5xl leading-none">Receive a delivery</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        One line per lot on the invoice. Copy the lot number exactly as printed on the package.
      </p>
      <ReceiveForm
        suppliers={suppliers.data ?? []}
        materials={materials.data ?? []}
        staff={people.data ?? []}
        defaultReceiver={staff?.id ?? ''}
        today={bakeryToday()}
      />
    </div>
  );
}
