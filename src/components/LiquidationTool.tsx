'use client';

import { useMemo, useState } from 'react';
import { formatNumber, formatPercent } from '@/lib/format';
import {
  FORMULA_ERROR_TEXT,
  calcLiquidation,
  type LiquidationResult,
  type Side,
} from '@/lib/formulas';
import { parseDecimal } from '@/lib/parse';
import { liquidationSampleFields, type LiquidationFields } from '@/lib/samples';
import { Field, PanelNote, SampleButton, Segmented, Stat, ToolGrid, ToolSection } from './ui';

type Fields = LiquidationFields;

function sideText(side: Side): string {
  return side === 'long' ? '做多' : '做空';
}

function expression(value: LiquidationResult): string {
  const rate = formatNumber(value.maintenanceMarginRate, 6);
  const entry = formatNumber(value.entry);
  const leverage = formatNumber(value.leverage);
  return value.side === 'long'
    ? `${entry} × (1 − 1/${leverage} + ${rate})`
    : `${entry} × (1 + 1/${leverage} − ${rate})`;
}

type View = { ok: true; value: LiquidationResult } | { ok: false; message: string };

function evaluate(fields: Fields): View {
  const entry = parseDecimal(fields.entry);
  const leverage = parseDecimal(fields.leverage);
  const mmrRaw = fields.maintenanceMarginPercent.trim();
  const maintenanceMarginPercent = mmrRaw === '' ? 0.5 : parseDecimal(mmrRaw);

  if (entry === null || leverage === null) {
    return { ok: false, message: '請輸入進場價與槓桿。' };
  }
  if (maintenanceMarginPercent === null) {
    return { ok: false, message: '維持保證金率請輸入數字，或留空使用 0.5%。' };
  }

  const result = calcLiquidation({
    side: fields.side,
    entry,
    leverage,
    maintenanceMarginPercent,
  });
  if (!result.ok) return { ok: false, message: FORMULA_ERROR_TEXT[result.code] };
  return result;
}

export function LiquidationTool() {
  const [fields, setFields] = useState<Fields>(liquidationSampleFields);
  const result = useMemo(() => evaluate(fields), [fields]);
  const value = result.ok ? result.value : null;

  return (
    <ToolSection
      id="liquidation"
      index="03"
      title="約略強平價"
      summary="用簡化的逐倉公式估算多單或空單的強平價。這不是任何一家交易所的官方算法，只能用來感受槓桿把虧損方向的價格拉近多少。"
    >
      <ToolGrid
        form={
          <form autoComplete="off" onSubmit={(event) => event.preventDefault()} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">輸入</h3>
              <SampleButton onClick={() => setFields(liquidationSampleFields)} />
            </div>
            <Segmented<Side>
              name="liq-side"
              label="方向"
              value={fields.side}
              onChange={(side) => setFields((current) => ({ ...current, side }))}
              options={[
                { value: 'long', label: '做多' },
                { value: 'short', label: '做空' },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="liq-entry"
                label="進場價"
                value={fields.entry}
                onChange={(entry) => setFields((current) => ({ ...current, entry }))}
              />
              <Field
                id="liq-leverage"
                label="槓桿"
                value={fields.leverage}
                onChange={(leverage) => setFields((current) => ({ ...current, leverage }))}
                hint="20 代表 20 倍。"
              />
            </div>
            <Field
              id="liq-mmr"
              label="維持保證金率（%，選填）"
              value={fields.maintenanceMarginPercent}
              onChange={(maintenanceMarginPercent) =>
                setFields((current) => ({ ...current, maintenanceMarginPercent }))
              }
              hint="0.5 代表 0.5%。留空時以 0.5% 計算。"
            />
            <p className="text-xs leading-5 text-faint">
              多單 ≈ 進場 × (1 − 1/槓桿 + 維持保證金率)。空單 ≈ 進場 × (1 + 1/槓桿 − 維持保證金率)。維持保證金率以小數代入。
            </p>
          </form>
        }
        result={
          <div className="space-y-5">
            <h3 className="text-sm font-medium">結果</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat
                label="約略強平價"
                value={value ? formatNumber(value.liquidationPrice) : '—'}
                testId="liq-price"
                emphasis
              />
              <Stat
                label="距進場"
                value={value ? formatPercent(value.distancePercent) : '—'}
                testId="liq-distance"
              />
              <Stat label="方向" value={value ? sideText(value.side) : sideText(fields.side)} />
              <Stat label="槓桿" value={value ? `${formatNumber(value.leverage)} 倍` : '—'} />
              <Stat
                label="維持保證金率"
                value={value ? formatPercent(value.maintenanceMarginPercent, 4) : '—'}
              />
            </dl>
            <PanelNote>
              此為約略估計，各交易所公式不同。檔位維持保證金、手續費、資金費率與標記價格都沒有算進去，請以交易所顯示的強平價為準。
            </PanelNote>
            {result.ok ? (
              <PanelNote>
                {sideText(result.value.side)}：{expression(result.value)} = {formatNumber(result.value.liquidationPrice)}。價格大約還要往虧損方向走{' '}
                {formatPercent(result.value.distancePercent)} 才會碰到這個估計。
              </PanelNote>
            ) : (
              <PanelNote tone="warn">{result.message}</PanelNote>
            )}
          </div>
        }
      />
    </ToolSection>
  );
}
