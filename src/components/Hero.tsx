import { formatNumber, formatRiskRewardRatio } from '@/lib/format';
import { calcLiquidation, calcPositionSize, calcRiskReward } from '@/lib/formulas';
import { liquidationSample, positionSample, riskRewardSample } from '@/lib/samples';

function must<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error('RiskPad sample failed to calculate');
  return result.value;
}

export function Hero() {
  const position = must(calcPositionSize(positionSample));
  const reward = must(calcRiskReward(riskRewardSample));
  const liquidation = must(calcLiquidation(liquidationSample));

  const rows = [
    {
      term: '名目價值',
      value: formatNumber(position.notional),
      detail: '資金 10,000 · 風險 1% · 進場 50,000 · 停損 49,000',
    },
    {
      term: '數量',
      value: formatNumber(position.quantity),
      detail: '風險金額 100 ÷ 停損距離 1,000',
    },
    {
      term: '風險報酬比',
      value: formatRiskRewardRatio(reward.rMultiple),
      detail: '進場 100 · 停損 90 · 目標 130',
    },
    {
      term: '約略強平價',
      value: formatNumber(liquidation.liquidationPrice),
      detail: '做多 · 進場 100 · 20 倍 · 維持保證金率 0.5%',
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="hero-wash pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:py-20">
        <div>
          <p className="text-sm tracking-wide text-gold-soft">交易倉位與風險計算</p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            把倉位與風險算清楚，再下單
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted">
            RiskPad 是免費的倉位風險計算機。合約倉位計算、風險報酬比計算、約略強平價，都在這台裝置上完成。不提供訊號，不需帳號，也沒有後端。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#position"
              className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-[#1a1408]"
            >
              開始試算
            </a>
            <a href="#howto" className="rounded-full border border-line px-4 py-2 text-sm text-ink">
              看怎麼用
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2 text-xs text-muted">
            {['純瀏覽器試算', '不提供交易訊號', '不需帳號'].map((item) => (
              <li key={item} className="rounded-full border border-line px-3 py-1">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-2xl border border-line bg-panel/90 p-5 sm:p-6">
          <p className="text-xs text-faint">打開頁面就能看到的範例 · 下方可改數字</p>
          <dl className="mt-4 divide-y divide-line">
            {rows.map((row) => (
              <div key={row.term} className="flex items-baseline justify-between gap-4 py-3">
                <dt>
                  <span className="block text-sm text-muted">{row.term}</span>
                  <span className="mt-1 block text-xs leading-5 text-faint">{row.detail}</span>
                </dt>
                <dd className="font-mono text-xl text-gold-soft tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
