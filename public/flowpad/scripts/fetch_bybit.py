#!/usr/bin/env python3
"""
FlowPad market snapshot builder.

Primary: Bybit v5 linear USDT perps
Fallback: OKX USDT swaps (same schema, source labeled) when Bybit is geo-blocked

Writes:
  data/market.json   — tickers + derived fields
  data/signals.json  — anomaly / trend / whale / rankings (transparent approximations)
  data/meta.json     — fetch metadata
"""
from __future__ import annotations

import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UA = "FlowPad/0.1 (+https://github.com/kuo5757957-netizen; research; not affiliated with Bybit)"
TZ8 = timezone(timedelta(hours=8))


def http_get(url: str, timeout: int = 45) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def safe_float(x: Any, default: float = 0.0) -> float:
    try:
        if x is None or x == "":
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


def fetch_bybit() -> tuple[list[dict], str]:
    """Return (normalized rows, source_note)."""
    url = "https://api.bybit.com/v5/market/tickers?category=linear"
    raw = http_get(url)
    if raw.get("retCode") != 0:
        raise RuntimeError(f"Bybit retCode={raw.get('retCode')} {raw.get('retMsg')}")
    rows = []
    for t in raw.get("result", {}).get("list", []):
        sym = t.get("symbol") or ""
        if not sym.endswith("USDT"):
            continue
        if sym.endswith("PERP"):  # skip inverse-style naming if any
            continue
        last = safe_float(t.get("lastPrice"))
        if last <= 0:
            continue
        rows.append(
            {
                "symbol": sym,
                "base": sym[:-4],
                "last": last,
                "bid": safe_float(t.get("bid1Price")),
                "ask": safe_float(t.get("ask1Price")),
                "high24h": safe_float(t.get("highPrice24h")),
                "low24h": safe_float(t.get("lowPrice24h")),
                "turnover24h": safe_float(t.get("turnover24h")),
                "volume24h": safe_float(t.get("volume24h")),
                "change24hPct": safe_float(t.get("price24hPcnt")) * 100.0,
                "fundingRate": safe_float(t.get("fundingRate")),
                "nextFundingTime": t.get("nextFundingTime"),
                "openInterest": safe_float(t.get("openInterest")),
                "openInterestValue": safe_float(t.get("openInterestValue")),
                "markPrice": safe_float(t.get("markPrice"), last),
                "indexPrice": safe_float(t.get("indexPrice"), last),
            }
        )
    return rows, "bybit"


def fetch_okx_fallback() -> tuple[list[dict], str]:
    tickers = http_get("https://www.okx.com/api/v5/market/tickers?instType=SWAP")
    if tickers.get("code") != "0":
        raise RuntimeError(f"OKX tickers code={tickers.get('code')}")
    oi_map: dict[str, float] = {}
    try:
        oi = http_get("https://www.okx.com/api/v5/public/open-interest?instType=SWAP")
        for r in oi.get("data", []):
            oi_map[r["instId"]] = safe_float(r.get("oiUsd") or r.get("oiCcy") or r.get("oi"))
    except Exception:
        pass

    funding_cache: dict[str, float] = {}
    # Batch funding for majors only to keep runtime short
    majors = {
        "BTC-USDT-SWAP",
        "ETH-USDT-SWAP",
        "SOL-USDT-SWAP",
        "DOGE-USDT-SWAP",
        "XRP-USDT-SWAP",
        "SUI-USDT-SWAP",
        "AVAX-USDT-SWAP",
        "LINK-USDT-SWAP",
        "HYPE-USDT-SWAP",
        "WLD-USDT-SWAP",
    }
    for inst in majors:
        try:
            fr = http_get(f"https://www.okx.com/api/v5/public/funding-rate?instId={inst}")
            if fr.get("data"):
                funding_cache[inst] = safe_float(fr["data"][0].get("fundingRate"))
            time.sleep(0.05)
        except Exception:
            continue

    rows = []
    for t in tickers.get("data", []):
        inst = t.get("instId") or ""
        if not inst.endswith("-USDT-SWAP"):
            continue
        base = inst.replace("-USDT-SWAP", "")
        last = safe_float(t.get("last"))
        open24 = safe_float(t.get("open24h"))
        if last <= 0:
            continue
        chg = ((last / open24) - 1.0) * 100.0 if open24 > 0 else 0.0
        rows.append(
            {
                "symbol": f"{base}USDT",
                "base": base,
                "last": last,
                "bid": safe_float(t.get("bidPx")),
                "ask": safe_float(t.get("askPx")),
                "high24h": safe_float(t.get("high24h")),
                "low24h": safe_float(t.get("low24h")),
                "turnover24h": safe_float(t.get("volCcy24h")),
                "volume24h": safe_float(t.get("vol24h")),
                "change24hPct": chg,
                "fundingRate": funding_cache.get(inst, 0.0),
                "nextFundingTime": None,
                "openInterest": 0.0,
                "openInterestValue": oi_map.get(inst, 0.0),
                "markPrice": last,
                "indexPrice": last,
                "okxInstId": inst,
            }
        )
    return rows, "okx-fallback"


def percentile_rank(values: list[float], x: float) -> float:
    if not values:
        return 50.0
    s = sorted(values)
    # fraction of values <= x
    n = len(s)
    le = sum(1 for v in s if v <= x)
    return 100.0 * le / n


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def score_instrument(row: dict, btc_chg: float, turnovers: list[float], oi_vals: list[float]) -> dict:
    """
    Transparent approximate ranking score (conceptually aligned with disclosed weight themes).
    Scale roughly ±100. CVD unavailable from venue alone → stubbed as 0 with note.
    """
    chg = row["change24hPct"]
    fund = row["fundingRate"]  # e.g. 0.0001
    oi_val = row["openInterestValue"]
    turn = row["turnover24h"]

    # OI component (~±25): higher OI value percentile mildly bullish for participation;
    # combined with price direction for "OI+price" theme. Real CVD missing → half weight reserved as stub.
    oi_pct = percentile_rank(oi_vals, oi_val) if oi_val > 0 else 50.0
    oi_score = (oi_pct - 50.0) / 50.0 * 25.0  # -25..+25
    cvd_score = 0.0  # stub — Bybit public REST alone has no CVD
    cvd_note = "CVD unavailable from Bybit public REST alone; treated as 0 (demo)"

    # 1H/24H momentum proxy using 24h change (~±20)
    mom = clamp(chg / 8.0, -1.0, 1.0) * 20.0

    # Funding extremes contrarian (~±15): very positive funding → slight short bias
    # typical funding ~0.01% = 0.0001
    fund_bps = fund * 10000.0  # in bps per period
    if fund_bps >= 5:
        fund_score = -15.0
    elif fund_bps >= 2:
        fund_score = -8.0
    elif fund_bps <= -5:
        fund_score = 15.0
    elif fund_bps <= -2:
        fund_score = 8.0
    else:
        fund_score = -fund_bps  # mild contrarian

    # L/S ratio contrarian — not available → 0 stub
    ls_score = 0.0
    ls_note = "L/S account ratio not fetched in MVP; stub 0"

    # Liquidations — not available → 0 stub
    liq_score = 0.0
    liq_note = "Liquidation feed not wired in MVP; stub 0"

    # Relative to BTC (~±15)
    rel = chg - btc_chg
    rel_score = clamp(rel / 6.0, -1.0, 1.0) * 15.0

    # Structure HH/HL proxy: price vs 24h mid range (~±10)
    hi, lo, last = row["high24h"], row["low24h"], row["last"]
    if hi > lo > 0:
        pos = (last - lo) / (hi - lo)  # 0..1
        struct = (pos - 0.5) * 2.0 * 10.0  # -10..+10
    else:
        struct = 0.0

    # Turnover participation soft boost (not in disclosed list, keep small)
    turn_pct = percentile_rank(turnovers, turn)
    turn_boost = (turn_pct - 50.0) / 50.0 * 5.0

    total = oi_score + cvd_score + mom + fund_score + ls_score + liq_score + rel_score + struct + turn_boost
    # Soft penalty for extreme dump (aligned with disclosed ~-20% day cut idea)
    if chg <= -20:
        total = min(total, -40.0)
        total -= 20.0

    total = clamp(total, -100.0, 100.0)
    return {
        "score": round(total, 2),
        "strength": round(abs(total) / 10.0, 1),  # 0..10 bars
        "side": "long" if total >= 0 else "short",
        "components": {
            "oi": round(oi_score, 2),
            "cvd": round(cvd_score, 2),
            "momentum24h": round(mom, 2),
            "fundingContrarian": round(fund_score, 2),
            "lsRatioContrarian": round(ls_score, 2),
            "liquidations": round(liq_score, 2),
            "btcRelative": round(rel_score, 2),
            "structure24h": round(struct, 2),
            "turnoverBoost": round(turn_boost, 2),
        },
        "notes": [cvd_note, ls_note, liq_note],
        "approximate": True,
    }


def anomaly_stage(row: dict, turnovers: list[float]) -> dict | None:
    """
    Concept stages: 確認突破 / 蓄勢待發 / 動能加速; buckets 看漲/看跌/觀察中.
    Not a direct 喊單 — observation cards only.
    """
    chg = abs(row["change24hPct"])
    signed = row["change24hPct"]
    turn_pct = percentile_rank(turnovers, row["turnover24h"])
    range_pct = 0.0
    if row["low24h"] > 0:
        range_pct = (row["high24h"] - row["low24h"]) / row["low24h"] * 100.0

    # Need some activity
    if turn_pct < 55 and chg < 4:
        return None

    if chg >= 12 and turn_pct >= 70:
        stage = "動能加速"
        note = "價格已明顯延伸且成交活躍；續動能可能存在，追價風險高，宜等回調觀察。"
    elif chg >= 5 and turn_pct >= 65:
        stage = "確認突破"
        note = "波動與成交同向抬升；需再觀察站穩與持倉是否同向（本 MVP 無完整 OI 時間序列）。"
    elif turn_pct >= 75 and chg < 5:
        stage = "蓄勢待發"
        note = "成交／資金活躍度先動，價格尚未大幅展開；方向未確認，先觀察。"
    elif chg >= 7:
        stage = "確認突破"
        note = "日內波動偏大；結構確認仍需量能與持倉佐證。"
    else:
        return None

    if signed > 1.5:
        bucket = "看漲"
    elif signed < -1.5:
        bucket = "看跌"
    else:
        bucket = "觀察中"

    # Soft invalidation proxy: mid of 24h range opposite side
    mid = (row["high24h"] + row["low24h"]) / 2.0 if row["high24h"] > 0 else row["last"]
    if bucket == "看漲":
        invalid = min(mid, row["last"] * 0.985)
    elif bucket == "看跌":
        invalid = max(mid, row["last"] * 1.015)
    else:
        invalid = mid

    return {
        "symbol": row["symbol"],
        "base": row["base"],
        "stage": stage,
        "bucket": bucket,
        "last": row["last"],
        "change24hPct": round(row["change24hPct"], 3),
        "turnoverPercentile": round(turn_pct, 1),
        "range24hPct": round(range_pct, 3),
        "note": note,
        "lifecycleHint": f"若 5m/15m 收盤越過結構失效參考位 ~{invalid:.6g}，視為本輪觀察失效。",
        "invalidationRef": invalid,
        "notOrder": True,
    }


def trend_card(row: dict, tf: str, btc_chg: float) -> dict | None:
    """
    Sykes-like card concept: direction, timeframe, entry/SL/TP, client states.
    Entry/SL/TP are transparent approximations from 24h range — NOT proprietary formulas.
    """
    chg = row["change24hPct"]
    rel = chg - btc_chg
    # Need clear enough directional bias
    if abs(chg) < 3.5 and abs(rel) < 2.5:
        return None
    if row["turnover24h"] < 1_000_000:
        return None

    direction = "long" if chg >= 0 else "short"
    last = row["last"]
    hi, lo = row["high24h"], row["low24h"]
    span = max(hi - lo, last * 0.01)

    # Quality heuristic
    if abs(chg) >= 8 and abs(rel) >= 3:
        quality = "高品質"
    elif abs(chg) >= 5:
        quality = "一般"
    else:
        quality = "結構偏弱"

    if direction == "long":
        entry = last * 0.998  # slight pullback preference
        sl = max(lo, entry - span * 0.35)
        r = abs(entry - sl)
        tp = entry + r * 1.5
    else:
        entry = last * 1.002
        sl = min(hi if hi > 0 else entry * 1.02, entry + span * 0.35)
        r = abs(entry - sl)
        tp = entry - r * 1.5

    if r <= 0:
        return None

    return {
        "symbol": row["symbol"],
        "base": row["base"],
        "direction": direction,
        "timeframe": tf,
        "quality": quality,
        "triggerPrice": round(entry, 8),
        "stopLoss": round(sl, 8),
        "takeProfit": round(tp, 8),
        "rDistance": round(r, 8),
        "last": last,
        "change24hPct": round(chg, 3),
        "btcRelative24hPct": round(rel, 3),
        "stateRule": "client: long price≥TP→止盈; ≤SL→止損; ≥0.5R favorable→平保; short mirror; missing TP→1R",
        "approximate": True,
        "note": "進場／停損／目標為 24h 波動透明近似，非對方專有賽克斯公式。",
    }


def compute_trend_state(card: dict) -> str:
    """Client lifecycle states matching documented rules."""
    d = card["direction"]
    px = card["last"]
    entry = card["triggerPrice"]
    sl = card["stopLoss"]
    tp = card.get("takeProfit")
    r = abs(entry - sl)
    if tp is None:
        tp = entry + r if d == "long" else entry - r
    if d == "long":
        if px >= tp:
            return "止盈"
        if px <= sl:
            return "止損"
        if px >= entry + 0.5 * r:
            return "平保"
    else:
        if px <= tp:
            return "止盈"
        if px >= sl:
            return "止損"
        if px <= entry - 0.5 * r:
            return "平保"
    return "持有中"


def whale_quadrant(row: dict, prev_oi: float | None, btc_chg: float) -> dict | None:
    """
    Whale radar concept: OI change × price change.
    Without OI history, approximate OI 'change' via openInterestValue percentile vs price —
    MVP marks observe-only for 15m/30m; 1H event when OI value high + price not overextended.
    """
    oi = row["openInterestValue"]
    if oi <= 0:
        return None
    chg = row["change24hPct"]
    # Proxy: treat high OI value + mild price move as 「持倉先行、價格未過度擴張」
    # Real OI delta needs history; we encode as synthetic oiDeltaPct using turnover/OI ratio.
    if oi > 0:
        activity = row["turnover24h"] / oi
    else:
        activity = 0.0
    # Heuristic oi "pressure"
    oi_delta_proxy = clamp((activity - 0.15) * 100.0, -30.0, 40.0)

    if oi_delta_proxy > 5 and abs(chg) < 4:
        q = "持倉先行／價格未過度擴張"
        event_1h = True
    elif oi_delta_proxy > 5 and chg >= 4:
        q = "多頭共振（持倉↑價格↑）示意"
        event_1h = False
    elif oi_delta_proxy > 5 and chg <= -4:
        q = "空頭建倉／下跌（持倉↑價格↓）示意"
        event_1h = False
    elif oi_delta_proxy < -5 and chg >= 4:
        q = "空頭回補／上漲（持倉↓價格↑）示意"
        event_1h = False
    elif oi_delta_proxy < -5 and chg <= -4:
        q = "多頭減倉／下跌（持倉↓價格↓）示意"
        event_1h = False
    else:
        return None

    return {
        "symbol": row["symbol"],
        "base": row["base"],
        "quadrant": q,
        "priceChangePct": round(chg, 3),
        "oiDeltaProxyPct": round(oi_delta_proxy, 3),
        "openInterestValue": oi,
        "event1h": event_1h,
        "observe15m30m": True,
        "note": "15m/30m 僅觀察不發卡片；1H 才產事件。OI 變化為活躍度代理（無歷史 OI 序列），示意用。",
        "approximate": True,
    }


def build_signals(rows: list[dict]) -> dict:
    btc = next((r for r in rows if r["symbol"] == "BTCUSDT"), None)
    btc_chg = btc["change24hPct"] if btc else 0.0
    turnovers = [r["turnover24h"] for r in rows]
    oi_vals = [r["openInterestValue"] for r in rows if r["openInterestValue"] > 0]

    # Focus liquid universe
    liquid = [r for r in rows if r["turnover24h"] >= 500_000]
    liquid.sort(key=lambda r: r["turnover24h"], reverse=True)
    universe = liquid[:180]

    rankings = []
    for r in universe:
        s = score_instrument(r, btc_chg, turnovers, oi_vals or [0.0])
        rankings.append(
            {
                "symbol": r["symbol"],
                "base": r["base"],
                "last": r["last"],
                "change24hPct": round(r["change24hPct"], 3),
                "fundingRate": r["fundingRate"],
                "openInterestValue": r["openInterestValue"],
                "turnover24h": r["turnover24h"],
                **s,
            }
        )
    rankings.sort(key=lambda x: x["score"], reverse=True)

    anomalies = []
    for r in universe[:120]:
        a = anomaly_stage(r, turnovers)
        if a:
            anomalies.append(a)
    # Prefer stronger stages / moves
    stage_rank = {"動能加速": 0, "確認突破": 1, "蓄勢待發": 2}
    anomalies.sort(key=lambda x: (stage_rank.get(x["stage"], 9), -abs(x["change24hPct"])))
    anomalies = anomalies[:40]

    trends = []
    for tf in ("15m", "5m"):
        for r in universe[:80]:
            c = trend_card(r, tf, btc_chg)
            if not c:
                continue
            c["state"] = compute_trend_state(c)
            trends.append(c)
    # Dedup by symbol+tf keeping higher |chg|
    seen = set()
    uniq = []
    for c in sorted(trends, key=lambda x: abs(x["change24hPct"]), reverse=True):
        key = (c["symbol"], c["timeframe"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    trends = uniq[:36]

    whales = []
    for r in universe[:100]:
        w = whale_quadrant(r, None, btc_chg)
        if w and (w["event1h"] or abs(w["priceChangePct"]) >= 4):
            whales.append(w)
    whales.sort(key=lambda x: (not x["event1h"], -abs(x["oiDeltaProxyPct"])))
    whales = whales[:30]

    return {
        "btcChange24hPct": round(btc_chg, 3),
        "rankings": rankings,
        "anomalies": anomalies,
        "trends": trends,
        "whales": whales,
        "disclaimer": "訊號為 FlowPad 透明近似規則（概念對齊公開說明），非投資建議、非對方專有公式複製品。",
    }


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    source = None
    rows: list[dict] = []
    errors: list[str] = []

    try:
        rows, source = fetch_bybit()
    except Exception as e:
        errors.append(f"bybit: {e}")
        try:
            rows, source = fetch_okx_fallback()
        except Exception as e2:
            errors.append(f"okx-fallback: {e2}")
            raise SystemExit("No market source available:\n" + "\n".join(errors))

    rows.sort(key=lambda r: r["turnover24h"], reverse=True)
    now = datetime.now(TZ8)
    meta = {
        "generatedAt": now.isoformat(),
        "generatedAtLabel": now.strftime("%Y-%m-%d %H:%M:%S") + " Asia/Shanghai",
        "source": source,
        "count": len(rows),
        "errors": errors,
        "schema": "flowpad-market-v1",
        "venueTarget": "bybit-linear-usdt",
        "notes": [
            "Prefer Bybit; OKX fallback only when Bybit HTTP fails (e.g. CloudFront geo-block).",
            "CVD / official L/S / liquidations not included from venue REST alone.",
        ],
    }

    market = {"meta": meta, "tickers": rows}
    signals = build_signals(rows)
    signals["meta"] = {
        "generatedAt": meta["generatedAt"],
        "generatedAtLabel": meta["generatedAtLabel"],
        "source": source,
        "approximate": True,
    }

    (DATA / "market.json").write_text(json.dumps(market, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "signals.json").write_text(json.dumps(signals, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # Pretty small summary for CLI
    print(json.dumps({"ok": True, "source": source, "tickers": len(rows), "anomalies": len(signals["anomalies"]), "trends": len(signals["trends"]), "whales": len(signals["whales"]), "rankings": len(signals["rankings"]), "at": meta["generatedAtLabel"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
