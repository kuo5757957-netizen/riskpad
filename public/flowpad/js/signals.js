/** Client-side lifecycle for FlowPad trend cards. */
export function computeTrendState(card) {
  const d = card.direction;
  const px = Number(card.last);
  const entry = Number(card.triggerPrice);
  const sl = Number(card.stopLoss);
  let tp = card.takeProfit == null ? null : Number(card.takeProfit);
  const r = Math.abs(entry - sl);
  if (tp == null || !Number.isFinite(tp)) {
    tp = d === "long" ? entry + r : entry - r; // missing TP → 1R
  }
  if (d === "long") {
    if (px >= tp) return "止盈";
    if (px <= sl) return "止損";
    if (px >= entry + 0.5 * r) return "平保";
  } else {
    if (px <= tp) return "止盈";
    if (px >= sl) return "止損";
    if (px <= entry - 0.5 * r) return "平保";
  }
  return "持有中";
}

export function strengthBars(strength, side) {
  const n = Math.max(0, Math.min(10, Math.round(Number(strength) || 0)));
  let html = '<span class="bars" title="強度 ' + n + '/10">';
  for (let i = 1; i <= 10; i++) {
    html += `<i class="${i <= n ? "on " + (side === "short" ? "short" : "long") : ""}"></i>`;
  }
  return html + "</span>";
}
