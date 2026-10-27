export type Side = 'long' | 'short';
export type RiskMode = 'percent' | 'amount';

export type FormulaErrorCode =
  | 'invalid-capital'
  | 'invalid-price'
  | 'same-price'
  | 'invalid-risk'
  | 'invalid-leverage'
  | 'invalid-target'
  | 'invalid-mmr'
  | 'liq-not-on-loss-side';

export type FormulaFailure = { ok: false; code: FormulaErrorCode };
export type FormulaSuccess<T> = { ok: true; value: T };
export type FormulaResult<T> = FormulaSuccess<T> | FormulaFailure;

export const FORMULA_ERROR_TEXT: Record<FormulaErrorCode, string> = {
  'invalid-capital': '帳戶資金需為大於 0 的數字。',
  'invalid-price': '價格需為大於 0 的數字。',
  'same-price': '進場價與停損價不能相同，否則沒有價差可計算。',
  'invalid-risk': '風險需為大於 0 的數字。',
  'invalid-leverage': '槓桿需為大於 0 的數字，或留空表示不使用。',
  'invalid-target': '目標價需為大於 0 的數字。',
  'invalid-mmr': '維持保證金率需為 0% 以上、小於 100% 的數字。',
  'liq-not-on-loss-side': '這組槓桿與維持保證金率沒有落在虧損方向的強平價。',
};

export type PositionInput = {
  capital: number;
  riskMode: RiskMode;
  /** Percentage points. 1 means 1% of capital. Ignored when riskMode is "amount". */
  riskPercent: number;
  /** Quoted currency. Ignored when riskMode is "percent". */
  riskAmount: number;
  entry: number;
  stop: number;
  /** Null skips leverage. Margin is notional / leverage when set. */
  leverage: number | null;
};

export type PositionResult = {
  side: Side;
  riskAmount: number;
  riskPercent: number;
  stopDistance: number;
  stopDistancePercent: number;
  quantity: number;
  notional: number;
  leverage: number | null;
  margin: number | null;
  riskExceedsCapital: boolean;
  marginExceedsCapital: boolean;
  notionalExceedsCapital: boolean;
};

export type RiskRewardInput = {
  entry: number;
  stop: number;
  target: number;
};

export type RiskRewardResult = {
  side: Side;
  riskDistance: number;
  rewardDistance: number;
  rMultiple: number;
  potentialPnlPercent: number;
  stopLossPercent: number;
  aligned: boolean;
};

export type LiquidationInput = {
  side: Side;
  entry: number;
  leverage: number;
  /** Percentage points. 0.5 means 0.5%. */
  maintenanceMarginPercent: number;
};

export type LiquidationResult = {
  side: Side;
  entry: number;
  leverage: number;
  maintenanceMarginPercent: number;
  maintenanceMarginRate: number;
  liquidationPrice: number;
  distancePercent: number;
};

function fail(code: FormulaErrorCode): FormulaFailure {
  return { ok: false, code };
}

function exceeds(left: number, right: number): boolean {
  return left - right > 1e-8;
}

/**
 * Size a position from a loss budget and the distance between entry and stop.
 * Quantity = risk amount / |entry - stop|. Notional = quantity * entry.
 * Leverage changes required margin only; it does not change the loss at the stop.
 */
export function calcPositionSize(input: PositionInput): FormulaResult<PositionResult> {
  const { capital, riskMode, entry, stop, leverage } = input;

  if (!Number.isFinite(capital) || capital <= 0) return fail('invalid-capital');
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(stop) || stop <= 0) {
    return fail('invalid-price');
  }
  if (entry === stop) return fail('same-price');
  if (leverage !== null && (!Number.isFinite(leverage) || leverage <= 0)) {
    return fail('invalid-leverage');
  }

  const riskAmount =
    riskMode === 'percent' ? capital * (input.riskPercent / 100) : input.riskAmount;
  if (!Number.isFinite(riskAmount) || riskAmount <= 0) return fail('invalid-risk');
  if (riskMode === 'percent' && (!Number.isFinite(input.riskPercent) || input.riskPercent <= 0)) {
    return fail('invalid-risk');
  }

  const stopDistance = Math.abs(entry - stop);
  const quantity = riskAmount / stopDistance;
  const notional = quantity * entry;
  const margin = leverage === null ? null : notional / leverage;

  return {
    ok: true,
    value: {
      side: stop < entry ? 'long' : 'short',
      riskAmount,
      riskPercent: (riskAmount / capital) * 100,
      stopDistance,
      stopDistancePercent: (stopDistance / entry) * 100,
      quantity,
      notional,
      leverage,
      margin,
      riskExceedsCapital: exceeds(riskAmount, capital),
      marginExceedsCapital: margin !== null && exceeds(margin, capital),
      notionalExceedsCapital: leverage === null && exceeds(notional, capital),
    },
  };
}

/**
 * Reward-to-risk from entry, stop, and target.
 * Side follows the stop: stop below entry is long. R = favorable distance / risk distance.
 * potential PnL % is that favorable distance divided by entry.
 */
export function calcRiskReward(input: RiskRewardInput): FormulaResult<RiskRewardResult> {
  const { entry, stop, target } = input;
  if (!Number.isFinite(entry) || entry <= 0 || !Number.isFinite(stop) || stop <= 0) {
    return fail('invalid-price');
  }
  if (entry === stop) return fail('same-price');
  if (!Number.isFinite(target) || target <= 0) return fail('invalid-target');

  const side: Side = stop < entry ? 'long' : 'short';
  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = side === 'long' ? target - entry : entry - target;

  return {
    ok: true,
    value: {
      side,
      riskDistance,
      rewardDistance,
      rMultiple: rewardDistance / riskDistance,
      potentialPnlPercent: (rewardDistance / entry) * 100,
      stopLossPercent: (riskDistance / entry) * 100,
      aligned: rewardDistance > 0,
    },
  };
}

/**
 * Rough isolated-margin liquidation price.
 * Long: entry * (1 - 1/leverage + maintenanceMarginRate)
 * Short: entry * (1 + 1/leverage - maintenanceMarginRate)
 * Exchange formulas differ; this ignores fees, funding, and tiered margin.
 */
export function calcLiquidation(input: LiquidationInput): FormulaResult<LiquidationResult> {
  const { side, entry, leverage, maintenanceMarginPercent } = input;
  if (!Number.isFinite(entry) || entry <= 0) return fail('invalid-price');
  if (!Number.isFinite(leverage) || leverage <= 0) return fail('invalid-leverage');
  if (
    !Number.isFinite(maintenanceMarginPercent) ||
    maintenanceMarginPercent < 0 ||
    maintenanceMarginPercent >= 100
  ) {
    return fail('invalid-mmr');
  }

  const maintenanceMarginRate = maintenanceMarginPercent / 100;
  const liquidationPrice =
    side === 'long'
      ? entry * (1 - 1 / leverage + maintenanceMarginRate)
      : entry * (1 + 1 / leverage - maintenanceMarginRate);

  const onLossSide =
    side === 'long'
      ? liquidationPrice > 0 && liquidationPrice < entry
      : Number.isFinite(liquidationPrice) && liquidationPrice > entry;

  if (!onLossSide) return fail('liq-not-on-loss-side');

  const distancePercent =
    side === 'long'
      ? ((entry - liquidationPrice) / entry) * 100
      : ((liquidationPrice - entry) / entry) * 100;

  return {
    ok: true,
    value: {
      side,
      entry,
      leverage,
      maintenanceMarginPercent,
      maintenanceMarginRate,
      liquidationPrice,
      distancePercent,
    },
  };
}
