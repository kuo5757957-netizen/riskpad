import { formatNumber, formatPercent, formatRiskRewardRatio } from '@/lib/format';
import { calcLiquidation, calcPositionSize, calcRiskReward } from '@/lib/formulas';
import { liquidationSample, positionSample, riskRewardSample } from '@/lib/samples';

function must<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error('RiskPad sample failed to calculate');
  return result.value;
}

const steps = [
  {
    title: '先寫下這筆最多能虧多少',
    body: '用帳戶資金的一個小百分比，或一個你真的承受得起的固定金額。不要先決定想買幾張。',
  },
  {
    title: '用進場和停損反推數量',
    body: '停損距離越大，同樣的虧損預算能買的數量就越少。倉位大小做的就是這件事。',
  },
  {
    title: '看目標價夠不夠付這段風險',
    body: '風險報酬比把目標距離除以停損距離。空間太小，代表為了一點利潤承擔相對大的虧損。',
  },
  {
    title: '有槓桿時，再看強平離進場多近',
    body: '槓桿不改變停損價上的虧損金額，但會把強平價拉近。若強平比停損更近，實際虧損可能大於你設定的風險。',
  },
];

export function HowTo() {
  const position = must(calcPositionSize(positionSample));
  const reward = must(calcRiskReward(riskRewardSample));
  const liquidation = must(calcLiquidation(liquidationSample));

  return (
    <section id="howto" aria-labelledby="howto-title" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <p className="font-mono text-xs tracking-[0.18em] text-gold">04</p>
        <h2 id="howto-title" className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
          下單前可以這樣用
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-line bg-panel p-5">
              <p className="font-mono text-xs text-gold">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-base font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-line bg-inset p-5 sm:p-6">
            <h3 className="text-sm font-medium">公式</h3>
            <pre className="mt-4 overflow-x-auto font-mono text-xs leading-6 text-muted sm:text-sm">
              {`數量 = 風險金額 ÷ |進場 − 停損|
名目價值 = 數量 × 進場價
R = 有利價差 ÷ |進場 − 停損|
潛在損益 % = 有利價差 ÷ 進場價
多單強平 ≈ 進場 × (1 − 1/槓桿 + 維持保證金率)
空單強平 ≈ 進場 × (1 + 1/槓桿 − 維持保證金率)`}
            </pre>
          </div>
          <div className="rounded-2xl border border-line p-5 sm:p-6">
            <h3 className="text-sm font-medium">範例</h3>
            <ul className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <li>
                <span className="text-ink">倉位。</span> 資金 {formatNumber(positionSample.capital)}，風險{' '}
                {formatNumber(positionSample.riskPercent)}%（金額 {formatNumber(position.riskAmount)}），進場{' '}
                {formatNumber(positionSample.entry)}，停損 {formatNumber(positionSample.stop)}。數量{' '}
                {formatNumber(position.quantity)}，名目價值 {formatNumber(position.notional)}。
              </li>
              <li>
                <span className="text-ink">風險報酬。</span> 進場 {formatNumber(riskRewardSample.entry)}，停損{' '}
                {formatNumber(riskRewardSample.stop)}，目標 {formatNumber(riskRewardSample.target)}。比值{' '}
                {formatRiskRewardRatio(reward.rMultiple)}，潛在損益 {formatPercent(reward.potentialPnlPercent)}。
              </li>
              <li>
                <span className="text-ink">強平。</span> 做多，進場 {formatNumber(liquidationSample.entry)}，槓桿{' '}
                {formatNumber(liquidationSample.leverage)} 倍，維持保證金率{' '}
                {formatPercent(liquidationSample.maintenanceMarginPercent)}。約略強平價{' '}
                {formatNumber(liquidation.liquidationPrice)}。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
