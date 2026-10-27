export const EMPTY = '—';

function clean(value: number): number {
  return Number(value.toPrecision(12));
}

export function formatNumber(value: number, maxDigits = 8): string {
  if (!Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0,
  }).format(clean(value));
}

export function formatPercent(value: number, maxDigits = 2): string {
  if (!Number.isFinite(value)) return EMPTY;
  return `${formatNumber(value, maxDigits)}%`;
}

export function formatRMultiple(value: number): string {
  if (!Number.isFinite(value)) return EMPTY;
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

/** Display form of a positive reward-to-risk multiple, e.g. 3 → "1 : 3". */
export function formatRiskRewardRatio(rMultiple: number): string {
  if (!Number.isFinite(rMultiple) || rMultiple <= 0) return EMPTY;
  return `1 : ${formatRMultiple(rMultiple)}`;
}
