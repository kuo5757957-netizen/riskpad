/* FlowPad dashboard — classic script (no bundler) */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function fmtPrice(n) {
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
  function fmtPct(n, digits = 2) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    return (x > 0 ? "+" : "") + x.toFixed(digits) + "%";
  }
  function fmtNum(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    if (Math.abs(x) >= 1e9) return (x / 1e9).toFixed(2) + "B";
    if (Math.abs(x) >= 1e6) return (x / 1e6).toFixed(2) + "M";
    if (Math.abs(x) >= 1e3) return (x / 1e3).toFixed(1) + "K";
    return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function clsChg(n) {
    const x = Number(n);
    if (!Number.isFinite(x) || x === 0) return "";
    return x > 0 ? "pos" : "neg";
  }
  function computeTrendState(card) {
    const d = card.direction;
    const px = Number(card.last);
    const entry = Number(card.triggerPrice);
    const sl = Number(card.stopLoss);
    let tp = card.takeProfit == null ? null : Number(card.takeProfit);
    const r = Math.abs(entry - sl);
    if (tp == null || !Number.isFinite(tp)) tp = d === "long" ? entry + r : entry - r;
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
  function strengthBars(strength, side) {
    const n = Math.max(0, Math.min(10, Math.round(Number(strength) || 0)));
    let html = '<span class="bars" title="強度 ' + n + '/10">';
    for (let i = 1; i <= 10; i++) {
      html += `<i class="${i <= n ? "on " + (side === "short" ? "short" : "long") : ""}"></i>`;
    }
    return html + "</span>";
  }

  const state = { market: null, signals: null, tab: "anomaly" };

  function setTab(id) {
    state.tab = id;
    $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));
    const url = new URL(location.href);
    url.searchParams.set("t", id);
    history.replaceState(null, "", url);
  }

  function renderMeta() {
    const meta = state.market?.meta || {};
    const src = meta.source || "—";
    const srcLabel =
      src === "bybit"
        ? "Bybit linear"
        : src === "okx-fallback"
          ? "OKX 後備（Bybit 不可達）"
          : src;
    $("#chip-source").innerHTML = `<strong>來源</strong> ${srcLabel}`;
    $("#chip-source").className = "chip " + (src === "bybit" ? "ok" : "warn");
    $("#chip-time").innerHTML = `<strong>更新</strong> ${meta.generatedAtLabel || "—"}`;
    $("#chip-count").innerHTML = `<strong>標的</strong> ${meta.count ?? "—"}`;
    const btc = (state.market?.tickers || []).find((t) => t.symbol === "BTCUSDT");
    if (btc) {
      $("#chip-btc").innerHTML = `<strong>BTC</strong> <span class="${clsChg(btc.change24hPct)}">${fmtPrice(btc.last)} (${fmtPct(btc.change24hPct)})</span>`;
    }
  }

  function renderAnomalies() {
    const box = $("#anomaly-grid");
    let list = state.signals?.anomalies || [];
    const bucket = $("#anomaly-bucket").value;
    const q = ($("#anomaly-q").value || "").trim().toUpperCase();
    if (bucket !== "all") list = list.filter((x) => x.bucket === bucket);
    if (q) list = list.filter((x) => x.symbol.includes(q) || x.base.includes(q));
    if (!list.length) {
      box.innerHTML = '<div class="empty">目前沒有符合條件的異常觀察卡</div>';
      return;
    }
    box.innerHTML = list
      .map(
        (a) => `
      <article class="card">
        <div class="card-top">
          <div class="sym">${a.base}<span style="color:var(--muted);font-weight:500">USDT</span></div>
          <div class="badges">
            <span class="badge stage">${a.stage}</span>
            <span class="badge ${a.bucket === "看漲" ? "long" : a.bucket === "看跌" ? "short" : "muted"}">${a.bucket}</span>
            <span class="badge muted">非喊單</span>
          </div>
        </div>
        <div class="kv">
          <div><span>現價</span><br><b>${fmtPrice(a.last)}</b></div>
          <div><span>24h</span><br><b class="${clsChg(a.change24hPct)}">${fmtPct(a.change24hPct)}</b></div>
          <div><span>成交量分位</span><br><b>${a.turnoverPercentile}</b></div>
          <div><span>日內振幅</span><br><b>${fmtPct(a.range24hPct)}</b></div>
        </div>
        <div class="note">${a.note}</div>
        <div class="note">${a.lifecycleHint || ""}</div>
      </article>`
      )
      .join("");
  }

  function renderTrends() {
    const box = $("#trend-grid");
    let list = (state.signals?.trends || []).map((c) => ({ ...c, state: computeTrendState(c) }));
    const tf = $("#trend-tf").value;
    const side = $("#trend-side").value;
    const q = ($("#trend-q").value || "").trim().toUpperCase();
    if (tf !== "all") list = list.filter((x) => x.timeframe === tf);
    if (side !== "all") list = list.filter((x) => x.direction === side);
    if (q) list = list.filter((x) => x.symbol.includes(q) || x.base.includes(q));
    if (!list.length) {
      box.innerHTML = '<div class="empty">目前沒有趨勢觀察卡</div>';
      return;
    }
    box.innerHTML = list
      .map((c) => {
        const dirLabel = c.direction === "long" ? "多" : "空";
        return `
      <article class="card">
        <div class="card-top">
          <div class="sym">${c.base}</div>
          <div class="badges">
            <span class="badge ${c.direction}">${dirLabel}</span>
            <span class="badge muted">${c.timeframe}</span>
            <span class="badge warn">${c.quality}</span>
            <span class="badge">${c.state}</span>
          </div>
        </div>
        <div class="kv">
          <div><span>觸發／進場參考</span><br><b>${fmtPrice(c.triggerPrice)}</b></div>
          <div><span>現價</span><br><b>${fmtPrice(c.last)}</b></div>
          <div><span>停損</span><br><b>${fmtPrice(c.stopLoss)}</b></div>
          <div><span>目標</span><br><b>${fmtPrice(c.takeProfit)}</b></div>
          <div><span>24h</span><br><b class="${clsChg(c.change24hPct)}">${fmtPct(c.change24hPct)}</b></div>
          <div><span>相對 BTC</span><br><b class="${clsChg(c.btcRelative24hPct)}">${fmtPct(c.btcRelative24hPct)}</b></div>
        </div>
        <div class="note">${c.note}</div>
        <div class="note">狀態規則：止盈／止損／平保（≥0.5R）由前端依現價計算。</div>
      </article>`;
      })
      .join("");
  }

  function renderTickers() {
    const q = ($("#ticker-q").value || "").trim().toUpperCase();
    let list = state.market?.tickers || [];
    if (q) list = list.filter((t) => t.symbol.includes(q) || t.base.includes(q));
    list = list.slice(0, 250);
    const body = $("#ticker-body");
    body.innerHTML = list
      .map(
        (t) => `<tr>
        <td>${t.base}</td>
        <td class="mono">${fmtPrice(t.last)}</td>
        <td class="mono ${clsChg(t.change24hPct)}">${fmtPct(t.change24hPct)}</td>
        <td class="mono">${fmtNum(t.turnover24h)}</td>
        <td class="mono">${fmtNum(t.openInterestValue)}</td>
        <td class="mono">${(Number(t.fundingRate) * 100).toFixed(4)}%</td>
      </tr>`
      )
      .join("");
  }

  function renderRankings() {
    const side = $("#rank-side").value;
    let list = [...(state.signals?.rankings || [])];
    if (side === "long") list = list.filter((x) => x.score >= 0);
    if (side === "short") list = list.filter((x) => x.score < 0).sort((a, b) => a.score - b.score);
    if (side === "all") {
      /* keep score desc */
    }
    list = list.slice(0, 60);
    $("#rank-body").innerHTML = list
      .map((r) => {
        const sideCls = r.side === "short" ? "short" : "long";
        return `<tr>
          <td>${r.base}</td>
          <td class="mono ${clsChg(r.score)}">${r.score.toFixed(1)}</td>
          <td>${strengthBars(r.strength, r.side)}</td>
          <td><span class="badge ${sideCls}">${r.side === "long" ? "偏多" : "偏空"}</span></td>
          <td class="mono ${clsChg(r.change24hPct)}">${fmtPct(r.change24hPct)}</td>
          <td class="mono">${fmtNum(r.turnover24h)}</td>
          <td class="mono">${fmtNum(r.openInterestValue)}</td>
        </tr>`;
      })
      .join("");
  }

  function renderWhales() {
    const box = $("#whale-grid");
    const only1h = $("#whale-1h").checked;
    let list = state.signals?.whales || [];
    if (only1h) list = list.filter((w) => w.event1h);
    $("#whale-grid").innerHTML = list.length
      ? list
          .map(
            (w) => `
      <article class="card">
        <div class="card-top">
          <div class="sym">${w.base}</div>
          <div class="badges">
            ${w.event1h ? '<span class="badge stage">1H 事件</span>' : '<span class="badge muted">示意</span>'}
            <span class="badge muted">15m/30m 觀察</span>
          </div>
        </div>
        <div class="note" style="color:var(--text);font-weight:600">${w.quadrant}</div>
        <div class="kv">
          <div><span>價格變化</span><br><b class="${clsChg(w.priceChangePct)}">${fmtPct(w.priceChangePct)}</b></div>
          <div><span>OI 代理變化</span><br><b class="${clsChg(w.oiDeltaProxyPct)}">${fmtPct(w.oiDeltaProxyPct)}</b></div>
          <div><span>OI 名義</span><br><b>${fmtNum(w.openInterestValue)}</b></div>
          <div><span>現價</span><br><b>${fmtPrice((state.market.tickers.find(t=>t.symbol===w.symbol)||{}).last)}</b></div>
        </div>
        <div class="note">${w.note}</div>
      </article>`
          )
          .join("")
      : '<div class="empty">目前沒有巨鯨象限卡片</div>';
  }

  function bind() {
    $$(".tab").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
    ["anomaly-bucket", "anomaly-q"].forEach((id) => $(`#${id}`)?.addEventListener("input", renderAnomalies));
    ["trend-tf", "trend-side", "trend-q"].forEach((id) => $(`#${id}`)?.addEventListener("input", renderTrends));
    $("#ticker-q")?.addEventListener("input", renderTickers);
    $("#rank-side")?.addEventListener("input", renderRankings);
    $("#whale-1h")?.addEventListener("change", renderWhales);
    $("#btn-reload")?.addEventListener("click", () => load(true));
  }

  async function load(bust) {
    const q = bust ? ("?t=" + Date.now()) : "";
    try {
      const [market, signals] = await Promise.all([
        fetch("data/market.json" + q).then((r) => {
          if (!r.ok) throw new Error("market.json " + r.status);
          return r.json();
        }),
        fetch("data/signals.json" + q).then((r) => {
          if (!r.ok) throw new Error("signals.json " + r.status);
          return r.json();
        }),
      ]);
      state.market = market;
      state.signals = signals;
      renderMeta();
      renderAnomalies();
      renderTrends();
      renderTickers();
      renderRankings();
      renderWhales();
      $("#load-error").textContent = "";
    } catch (e) {
      $("#load-error").textContent = "載入失敗：" + e.message + "（請用本機 HTTP 伺服器開啟，勿直接 file://）";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    const t = new URL(location.href).searchParams.get("t") || "anomaly";
    setTab(t);
    load(false);
  });
})();
