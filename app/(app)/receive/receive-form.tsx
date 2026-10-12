'use client';

import { useActionState, useRef, useState } from 'react';
import { formatQty } from '@/lib/format';
import { receiveDelivery, type ReceiveState } from './actions';

type Material = {
  id: string;
  kind: 'raw_material' | 'packaging';
  code: string;
  name: string;
  package_unit: string;
  qty_per_package: number;
  base_unit: string;
};

type Line = { key: number; material_id: string; lot_code: string; packages: string; expires_on: string };

const PACKAGE_LABEL: Record<string, string> = { cs: 'cases', bag: 'bags', pail: 'pails', pc: 'pieces' };

const emptyLine = (key: number): Line => ({ key, material_id: '', lot_code: '', packages: '1', expires_on: '' });

export function ReceiveForm({
  suppliers,
  materials,
  staff,
  defaultReceiver,
  today,
}: {
  suppliers: { id: string; name: string }[];
  materials: Material[];
  staff: { id: string; display_name: string }[];
  defaultReceiver: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<ReceiveState, FormData>(receiveDelivery, {});
  const [header, setHeader] = useState({ supplier_id: '', invoice_number: '', received_on: today, received_by: defaultReceiver });
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(0)]);
  const nextKey = useRef(1);

  const byId = new Map(materials.map((m) => [m.id, m]));
  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const payload = JSON.stringify({
    ...header,
    lines: lines.map(({ key: _key, ...line }) => line),
  });

  return (
    <form action={formAction} className="mt-10">
      <input type="hidden" name="payload" value={payload} />

      <fieldset className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Delivery</legend>
        <div>
          <label htmlFor="supplier" className="field-label">Supplier</label>
          <select id="supplier" className="field" value={header.supplier_id} onChange={(e) => setHeader({ ...header, supplier_id: e.target.value })} required>
            <option value="">Choose…</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="invoice" className="field-label">Invoice number</label>
          <input id="invoice" className="field font-mono" value={header.invoice_number} onChange={(e) => setHeader({ ...header, invoice_number: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="received_on" className="field-label">Received on</label>
          <input id="received_on" type="date" className="field" value={header.received_on} max={today} onChange={(e) => setHeader({ ...header, received_on: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="received_by" className="field-label">Received by</label>
          <select id="received_by" className="field" value={header.received_by} onChange={(e) => setHeader({ ...header, received_by: e.target.value })} required>
            <option value="">Choose…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className="mt-10">
        <legend className="eyebrow">Lots on this invoice</legend>
        <ol className="mt-3 space-y-3">
          {lines.map((line, i) => {
            const material = byId.get(line.material_id);
            const total = material && Number(line.packages) > 0 ? Number(line.packages) * material.qty_per_package : null;
            return (
              <li key={line.key} className="rise grid gap-3 rounded-md border border-rule bg-paper p-4 md:grid-cols-[2.2fr_1.2fr_1fr_1.1fr_auto] md:items-start">
                <div>
                  <label htmlFor={`m-${line.key}`} className="field-label">{i + 1}. Item</label>
                  <select id={`m-${line.key}`} className="field" value={line.material_id} onChange={(e) => updateLine(line.key, { material_id: e.target.value })} required>
                    <option value="">Choose…</option>
                    <optgroup label="Ingredients">
                      {materials.filter((m) => m.kind === 'raw_material').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                    <optgroup label="Packaging">
                      {materials.filter((m) => m.kind === 'packaging').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label htmlFor={`lot-${line.key}`} className="field-label">Lot number</label>
                  <input id={`lot-${line.key}`} className="field font-mono uppercase" value={line.lot_code} onChange={(e) => updateLine(line.key, { lot_code: e.target.value.toUpperCase() })} required />
                </div>
                <div>
                  <label htmlFor={`p-${line.key}`} className="field-label">{material ? PACKAGE_LABEL[material.package_unit] : 'Packages'}</label>
                  <input id={`p-${line.key}`} type="number" min="0.01" step="any" inputMode="decimal" className="field" value={line.packages} onChange={(e) => updateLine(line.key, { packages: e.target.value })} required />
                  <p className="mt-1 h-4 text-xs text-ink-soft">{total != null ? `= ${formatQty(total, material!.base_unit)}` : ''}</p>
                </div>
                <div>
                  <label htmlFor={`x-${line.key}`} className="field-label">Expires</label>
                  <input id={`x-${line.key}`} type="date" className="field" value={line.expires_on} onChange={(e) => updateLine(line.key, { expires_on: e.target.value })} />
                  <p className="mt-1 h-4 text-xs text-ink-soft">{material?.kind === 'packaging' ? 'Optional for packaging' : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                  disabled={lines.length === 1}
                  className="btn btn-ghost disabled:opacity-30 md:mt-[1.6rem]"
                  aria-label={`Remove line ${i + 1}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setLines((all) => [...all, emptyLine(nextKey.current++)])} className="btn btn-ghost mt-3">
          + Add a lot
        </button>
      </fieldset>

      {state.error && (
        <p role="alert" className="mt-8 rounded-md border-l-4 border-alert bg-alert-soft px-4 py-3 text-alert">
          {state.error}
        </p>
      )}

      <div className="mt-8 flex items-center gap-4 border-t-2 border-ink pt-6">
        <button type="submit" disabled={pending} className="btn btn-primary min-w-48">
          {pending ? 'Recording…' : `Record ${lines.length} lot${lines.length > 1 ? 's' : ''}`}
        </button>
        <p className="text-sm text-ink-soft">Quantities are stored in pounds or pieces.</p>
      </div>
    </form>
  );
}
