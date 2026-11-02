export function toNumber(value: string | number | null | undefined): number {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '');
  if (raw === '') return 0;
  const normalized = raw.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}