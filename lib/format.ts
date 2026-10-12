export type LotKind = 'raw_material' | 'packaging' | 'wip' | 'finished' | 'packed';

// The order a lot moves through the bakery.
export const STAGES: { kind: LotKind; label: string }[] = [
  { kind: 'raw_material', label: 'Ingredients' },
  { kind: 'packaging', label: 'Packaging' },
  { kind: 'wip', label: 'Batches' },
  { kind: 'finished', label: 'Baked' },
  { kind: 'packed', label: 'Packed' },
];

export function stageLabel(kind: string): string {
  return STAGES.find((s) => s.kind === kind)?.label ?? kind;
}

export function formatQty(quantity: number | null, unit: string | null): string {
  if (quantity == null) return '—';
  return `${Number(quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${unit ?? ''}`.trim();
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TIME_ZONE = process.env.BAKERY_TIME_ZONE ?? 'America/New_York';

// Today's date at the bakery, as YYYY-MM-DD.
export function bakeryToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
