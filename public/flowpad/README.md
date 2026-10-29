# FlowPad 資金流儀表板

Bybit 線性 USDT 永續為目標資料源的資金流／異常觀察／趨勢卡／推薦榜 **MVP**。  
原創品牌與介面；規則為**透明自寫近似**（概念對齊常見公開說明），**不是**複製第三方商標、文案或專有公式。

教育用途，非投資建議。

## 快速預覽

在本倉庫（RiskPad）裡：

```bash
cd public/flowpad
python3 scripts/fetch_bybit.py   # 優先 Bybit；失敗則 OKX 後備
python3 -m http.server 8765
```

瀏覽器開啟 <http://127.0.0.1:8765/>

## 分頁

| 分頁 | 內容 |
|------|------|
| OI／異常警報 | 確認突破／蓄勢待發／動能加速；看漲／看跌／觀察中（非喊單） |
| 趨勢訊號 | 5m／15m 卡；止盈／止損／平保狀態由前端計算 |
| 幣種一覽 | 快照表 |
| 推薦榜 | 透明近似分數（CVD 等不可用時標 demo） |
| 巨鯨象限 | OI×價格概念示意；1H 事件／15m·30m 觀察 |
| 說明 | 規則與限制 |

## 資料管線

- `scripts/fetch_bybit.py` → 寫入 `data/market.json`、`data/signals.json`、`data/meta.json`
- 前端只讀本地 JSON（避免瀏覽器直連交易所 CORS／地區限制）
- GitHub Actions（`.github/workflows/refresh-flowpad-data.yml`）每 30 分鐘重抓並提交 JSON

## 部署

這個目錄就是 RiskPad 倉庫的 `public/flowpad/`。GitHub Pages 用 Actions 部署 Next 的 `out/`，靜態檔會出現在：

<https://kuo5757957-netizen.github.io/riskpad/flowpad/>

`.github/workflows/refresh-flowpad-data.yml` 每 30 分鐘在此目錄執行 `scripts/fetch_bybit.py`，JSON 有變才提交並重新部署 Pages。介面資源用相對路徑，不需要另外的 base path。

## 限制（誠實清單）

- 本建置環境若被 Bybit CloudFront 地區封鎖，快照會標 `okx-fallback`
- 無 CVD／完整清算／官方多空比時，相關權重為 0 並標 approximate
- 趨勢進場／停損／目標為 24h 區間啟發式，不是對方賽克斯原式
- 巨鯨 OI 變化在無歷史序列時用活躍度代理

## 授權與聲明

自行使用；勿冒充交易所或第三方產品。合約交易有虧損本金風險。
