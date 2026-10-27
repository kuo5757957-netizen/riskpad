'use client';

import { useMemo, useState } from 'react';
import { formatNumber, formatPercent } from '@/lib/format';
import {
  FORMULA_ERROR_TEXT,
  calcPositionSize,
  type PositionResult,
  type RiskMode,
} from '@/lib/formulas';
import { parseDecimal } from '@/lib/parse';
import { positionSampleFields, type PositionFields } from '@/lib/samples';
import { Field, PanelNote, SampleButton, Segmented, Stat, ToolGrid, ToolSection } from './ui';

type Fields = PositionFields;

function sideText(side: PositionResult['side']): string {
  return side === 'long' ? '做多' : '做空';
}

type View = { ok: true; value: PositionResult } | { ok: false; message: string };

function evaluate(fields: Fields): View {
  const capital = parseDecimal(fields.capital);
  const entry = parseDecimal(fields.entry);
  const stop = parseDecimal(fields.stop);
  const leverageRaw = fields.leverage.trim();
  const leverage = leverageRaw ? parseDecimal(fields.leverage) : null;
  const riskPercent = parseDecimal(fields.riskPercent);
  const riskAmount = parseDecimal(fields.riskAmount);

  if (capital === null || entry === null || stop === null) {
    return { ok: false, message: '請輸入帳戶資金、進場價與停損價。' };
  }
  if (leverageRaw && leverage === null) {
    return { ok: false, message: '槓桿請輸入數字，或留空。' };
  }
  if (fields.riskMode === 'percent' && riskPercent === null) {
    return { ok: false, message: '請輸入單筆風險百分比。' };
  }
  if (fields.riskMode === 'amount' && riskAmount === null) {
    return { ok: false, message: '請輸入單筆風險金額。' };
  }

  const result = calcPositionSize({
    capital,
    riskMode: fields.riskMode,
    riskPercent: riskPercent ?? 0,
    riskAmount: riskAmount ?? 0,
    entry,
    stop,
    leverage,
  });
  if (!result.ok) return { ok: false, message: FORMULA_ERROR_TEXT[result.code] };
  return result;
}

export function PositionSizeTool() {
  const [fields, setFields] = useState<Fields>(positionSampleFields);
  const result = useMemo(() => evaluate(fields), [fields]);
  const value = result.ok ? result.value : null;

  function set<K extends keyof Fields>(key: K, next: Fields[K]) {
    setFields((current) => ({ ...current, [key]: next }));
  }

  return (
    <ToolSection
      id="position"
      index="01"
      title="倉位大小"
      summary="先決定這筆可以虧多少，再用進場價和停損價的距離反推數量與名目價值。槓桿只用來估算所需保證金，不改變停損時的虧損金額。"
    >
      <ToolGrid
        form={
          <form
            autoComplete="off"
            onSubmit={(event) => event.preventDefault()}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">輸入</h3>
              <SampleButton onClick={() => setFields(positionSampleFields)} />
            </div>
            <Field
              id="position-capital"
              label="帳戶資金"
              value={fields.capital}
              onChange={(next) => set('capital', next)}
            />
            <Segmented<RiskMode>
              name="position-risk-mode"
              label="風險方式"
              value={fields.riskMode}
              onChange={(next) => set('riskMode', next)}
              options={[
                { value: 'percent', label: '資金百分比' },
                { value: 'amount', label: '固定金額' },
              ]}
            />
            {fields.riskMode === 'percent' ? (
              <Field
                id="position-risk-percent"
                label="單筆風險（%）"
                value={fields.riskPercent}
                onChange={(next) => set('riskPercent', next)}
                hint="1 代表帳戶資金的 1%。"
              />
            ) : (
              <Field
                id="position-risk-amount"
                label="單筆風險金額"
                value={fields.riskAmount}
                onChange={(next) => set('riskAmount', next)}
                hint="這筆交易停損成交時，願意虧掉的金額。"
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="position-entry"
                label="進場價"
                value={fields.entry}
                onChange={(next) => set('entry', next)}
              />
              <Field
                id="position-stop"
                label="停損價"
                value={fields.stop}
                onChange={(next) => set('stop', next)}
              />
            </div>
            <Field
              id="position-leverage"
              label="槓桿（選填）"
              value={fields.leverage}
              onChange={(next) => set('leverage', next)}
              hint="留空表示不計槓桿。數量以標的資產計；若合約有面值，請再換算張數。"
            />
            <p className="text-xs leading-5 text-faint">
              數量 = 可承受虧損 ÷ |進場 − 停損|。名目價值 = 數量 × 進場價。輸入後立即試算。
            </p>
          </form>
        }
        result={
          <div className="space-y-5">
            <h3 className="text-sm font-medium">結果</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat
                label="名目價值"
                value={value ? formatNumber(value.notional) : '—'}
                testId="position-notional"
                emphasis
              />
              <Stat
                label="數量"
                value={value ? formatNumber(value.quantity) : '—'}
                testId="position-qty"
                emphasis
              />
              <Stat
                label="風險金額"
                value={value ? formatNumber(value.riskAmount) : '—'}
                testId="position-risk-amount"
              />
              <Stat
                label="風險占比"
                value={value ? formatPercent(value.riskPercent) : '—'}
                testId="position-risk-percent"
              />
              <Stat label="方向" value={value ? sideText(value.side) : '—'} />
              <Stat
                label="停損距離"
                value={
                  value
                    ? `${formatNumber(value.stopDistance)}（${formatPercent(value.stopDistancePercent)}）`
                    : '—'
                }
              />
              <Stat
                label="所需保證金"
                value={!value ? '—' : value.margin === null ? '未使用槓桿' : formatNumber(value.margin)}
              />
            </dl>
            {result.ok ? (
              <div className="space-y-3">
                <PanelNote>
                  以{sideText(result.value.side)}計，停損距離 {formatNumber(result.value.stopDistance)}。可承受虧損{' '}
                  {formatNumber(result.value.riskAmount)}，所以數量是 {formatNumber(result.value.quantity)}，名目價值是{' '}
                  {formatNumber(result.value.notional)}。
                </PanelNote>
                {result.value.leverage !== null ? (
                  <PanelNote>
                    槓桿 {formatNumber(result.value.leverage)} 倍時，所需保證金約 {formatNumber(result.value.margin ?? 0)}。停損成交的虧損仍約為風險金額；若強平比停損更近，實際虧損會更大。
                  </PanelNote>
                ) : null}
                {result.value.riskExceedsCapital ? (
                  <PanelNote tone="warn">風險金額大於帳戶資金。</PanelNote>
                ) : null}
                {result.value.marginExceedsCapital ? (
                  <PanelNote tone="warn">所需保證金大於帳戶資金，以目前槓桿放不下這個倉位。</PanelNote>
                ) : null}
                {result.value.notionalExceedsCapital ? (
                  <PanelNote tone="warn">名目價值大於帳戶資金。未使用槓桿時，這個倉位需要更多資金。</PanelNote>
                ) : null}
              </div>
            ) : (
              <PanelNote tone="warn">{result.message}</PanelNote>
            )}
          </div>
        }
      />
    </ToolSection>
  );
}
