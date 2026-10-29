# RiskPad

交易倉位與風險計算。免費、純瀏覽器的試算工具：倉位大小、風險報酬比、約略強平價。不提供訊號、不需帳號、沒有後端。

把倉位與風險算清楚，再下單。

教育用途，非投資建議、非代操。

## 功能

1. **倉位大小**：帳戶資金、風險百分比或固定風險金額、進場價、停損價，以及選填槓桿。算出名目價值、數量、風險金額、風險占比。槓桿只換算所需保證金。
2. **風險報酬比**：進場價、停損價、目標價。算出 R 倍數與潛在損益百分比。
3. **約略強平價**：做多或做空、進場價、槓桿、選填維持保證金率。這是簡化估計，各交易所公式不同。

計算都在瀏覽器內完成，輸入的數字不會上傳。

## 公式與範例

數量 = 風險金額 ÷ |進場 − 停損|

名目價值 = 數量 × 進場價

R = 有利方向價差 ÷ |進場 − 停損|

潛在損益 % = 有利方向價差 ÷ 進場價

多單強平價 ≈ 進場 × (1 − 1/槓桿 + 維持保證金率)

空單強平價 ≈ 進場 × (1 + 1/槓桿 − 維持保證金率)

維持保證金率以小數代入，介面上的 `0.5` 代表 0.5%（0.005）。

| 工具 | 輸入 | 結果 |
| --- | --- | --- |
| 倉位大小 | 資金 10,000、風險 1%、進場 50,000、停損 49,000 | 名目價值 5,000、數量 0.1 |
| 風險報酬比 | 進場 100、停損 90、目標 130 | 1:3、潛在損益 30% |
| 約略強平價 | 做多、進場 100、20 倍、維持保證金率 0.5% | 約 95.5 |

頁面預設就是這三組數字，打開即可核對。

## 本地執行

需要 Node.js 22。ESLint 仍使用 TypeScript 6 的程式 API，所以開發依賴裡的 `typescript` 指向 `@typescript/typescript6`，TypeScript 7 編譯器是 `@typescript/native`。

```bash
npm install
npm test
npm run lint
npm run dev
```

瀏覽器打開 <http://localhost:3000>。

靜態輸出：

```bash
npm run build
npx serve out
```

專案頁路徑（對應 GitHub Pages 的 `/riskpad`）可以在建置時指定：

```bash
NEXT_PUBLIC_BASE_PATH=/riskpad \
NEXT_PUBLIC_SITE_URL=https://kuo5757957-netizen.github.io/riskpad \
npm run build
```

| 變數 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | 站點子路徑。專案頁為 `/riskpad`；使用者站點留空。 |
| `NEXT_PUBLIC_SITE_URL` | 完整網址，不含結尾斜線。用來產生 canonical 與 sitemap。 |

未設定時，本地開發不帶子路徑；正式站預設網址為 `https://kuo5757957-netizen.github.io/riskpad`。

## GitHub Pages

工作流程在 `.github/workflows/pages.yml`。推上 `main` 之後會：

1. 使用 Node.js 22 執行 `npm ci` 與 `npm test`（公式單元測試）。
2. 用 `actions/configure-pages@v5` 讀取 `base_path` 與 `base_url`。
3. 以這兩個值建置靜態輸出（`output: 'export'`）。
4. 上傳 `out/`，並用 `actions/deploy-pages@v4` 部署。

請在倉庫設定啟用 Pages，來源選 GitHub Actions：

**Settings → Pages → Build and deployment → Source → GitHub Actions**

部署完成後的網址：

<https://kuo5757957-netizen.github.io/riskpad/>

若第一次推送時 Pages 尚未啟用，該次 Actions 會在設定頁面之前失敗。啟用來源後，到 Actions 重新執行「Deploy GitHub Pages」即可。

## FlowPad

資金流儀表板是獨立的靜態頁，放在 `public/flowpad/`（`index.html`、`css/`、`js/`、`data/`、`scripts/`、`.nojekyll`）。Next 靜態輸出會把 `public/` 原樣複製到 `out/`，因此跟 RiskPad 同一份 Pages 產物一起上線，網址是：

<https://kuo5757957-netizen.github.io/riskpad/flowpad/>

RiskPad 的計算頁、公式與 `pages.yml` 不變。資料更新在 `.github/workflows/refresh-flowpad-data.yml`：每 30 分鐘進入 `public/flowpad` 執行 `scripts/fetch_bybit.py`，只有 JSON 有變才提交，再觸發既有的 Deploy GitHub Pages（`GITHUB_TOKEN` 的推送不會自動啟動其他工作流程）。

## 聲明

本站僅供教育與自行試算，非投資建議、非代操，也不提供交易訊號。槓桿與合約可能損失全部保證金。約略強平價不是交易所的官方公式。
