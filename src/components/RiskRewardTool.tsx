'use client';

import { useMemo, useState } from 'react';
import { formatNumber, formatPercent, formatRMultiple, formatRiskRewardRatio } from '@/lib/format';
import { FORMULA_ERROR_TEXT, calcRiskReward, type RiskRewardResult } from '@/lib/formulas';
import { parseDecimal } from '@/lib/parse';
import { riskRewardSampleFields, type RiskRewardFields } from '@/lib/samples';
import { Field, PanelNote, SampleButton, Stat, ToolGrid, ToolSection } from './ui';

type Fields = RiskRewardFields;

function sideText(side: RiskRewardResult['side']): string {
  return side === 'long' ? '做多' : '做空';
}

type View = { ok: true; value: RiskRewardResult } | { ok: false; message: string };

function evaluate(fields: Fields): View {
  const entry = parseDecimal(fields.entry);
  const stop = parseDecimal(fields.stop);
  const target = parseDecimal(fields.target);
  if (entry === null || stop === null || target === null) {
    return { ok: false, message: '請輸入進場價、停損價與目標價。' };
  }
  const result = calcRiskReward({ entry, stop, target });
  if (!result.ok) return { ok: false, message: FORMULA_ERROR_TEXT[result.code] };
  return result;
}

export function RiskRewardTool() {
  const [fields, setFields] = useState<Fields>(riskRewardSampleFields);
  const result = useMemo(() => evaluate(fields), [fields]);
  const value = result.ok ? result.value : null;

  function set<K extends keyof Fields>(key: K, next: Fields[K]) {
    setFields((current) => ({ ...current, [key]: next }));
  }

  return (
    <ToolSection
      id="reward"
      index="02"
      title="風險報酬比"
      summary="比較停損距離和目標距離。R 倍數是報酬距離除以風險距離；1:3 代表目標空間是停損空間的三倍。方向由停損相對進場的位置決定。"
    >
      <ToolGrid
        form={
          <form autoComplete="off" onSubmit={(event) => event.preventDefault()} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">輸入</h3>
              <SampleButton onClick={() => setFields(riskRewardSampleFields)} />
            </div>
            <Field id="rr-entry" label="進場價" value={fields.entry} onChange={(next) => set('entry', next)} />
            <Field
              id="rr-stop"
              label="停損價"
              value={fields.stop}
              onChange={(next) => set('stop', next)}
              hint="低於進場視為做多，高於進場視為做空。"
            />
            <Field id="rr-target" label="目標價" value={fields.target} onChange={(next) => set('target', next)} />
            <p className="text-xs leading-5 text-faint">
              R = 有利方向價差 ÷ |進場 − 停損|。潛在損益 % = 有利方向價差 ÷ 進場價。
            </p>
          </form>
        }
        result={
          <div className="space-y-5">
            <h3 className="text-sm font-medium">結果</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              <Stat
                label="風險報酬比"
                value={value ? formatRiskRewardRatio(value.rMultiple) : '—'}
                testId="rr-ratio"
                emphasis
              />
              <Stat
                label="潛在損益"
                value={value ? formatPercent(value.potentialPnlPercent) : '—'}
                testId="rr-pnl"
                emphasis
              />
              <Stat label="R 倍數" value={value ? formatRMultiple(value.rMultiple) : '—'} testId="rr-multiple" />
              <Stat label="方向" value={value ? sideText(value.side) : '—'} />
              <Stat label="風險距離" value={value ? formatNumber(value.riskDistance) : '—'} />
              <Stat
                label="報酬距離"
                value={value ? formatNumber(value.rewardDistance) : '—'}
              />
              <Stat label="停損幅度" value={value ? formatPercent(value.stopLossPercent) : '—'} />
            </dl>
            {result.ok ? (
              result.value.aligned ? (
                <PanelNote>
                  以{sideText(result.value.side)}計，風險距離 {formatNumber(result.value.riskDistance)}，報酬距離{' '}
                  {formatNumber(result.value.rewardDistance)}，風險報酬比 {formatRiskRewardRatio(result.value.rMultiple)}。打到目標時，相對進場價的潛在損益約{' '}
                  {formatPercent(result.value.potentialPnlPercent)}。
                </PanelNote>
              ) : (
                <PanelNote tone="warn">
                  目標價與停損在進場價的同一側，這筆沒有正的報酬空間。若仍以該目標平倉，損益約{' '}
                  {formatPercent(result.value.potentialPnlPercent)}。
                </PanelNote>
              )
            ) : (
              <PanelNote tone="warn">{result.message}</PanelNote>
            )}
          </div>
        }
      />
    </ToolSection>
  );
}
