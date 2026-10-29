export function fmtPrice(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  let d = 4;
  if (ax >= 1000) d = 2;
  else if (ax >= 100) d = 3;
  else if (ax >= 1) d = 4;
  else if (ax >= 0.1) d = 5;
  else d = 6;
  return x.toLocaleString("en-US", { maximumFractionDigits: d });
}
export function fmtPct(n, digits = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const s = x.toFixed(digits);
  return (x > 0 ? "+" : "") + s + "%";
}
export function fmtNum(n, digits = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1e9) return (x / 1e9).toFixed(2) + "B";
  if (Math.abs(x) >= 1e6) return (x / 1e6).toFixed(2) + "M";
  if (Math.abs(x) >= 1e3) return (x / 1e3).toFixed(1) + "K";
  return x.toLocaleString("en-US", { maximumFractionDigits: digits });
}
export function clsChg(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x === 0) return "";
  return x > 0 ? "pos" : "neg";
}
