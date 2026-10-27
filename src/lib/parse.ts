/**
 * Parse a user-entered decimal. Accepts grouping commas, spaces, and fullwidth digits.
 * Returns null when the field is empty or not a finite number.
 */
export function parseDecimal(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/．/g, '.')
    .replace(/，/g, ',')
    .replace(/,/g, '')
    .replace(/\s+/g, '');

  if (!cleaned) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
