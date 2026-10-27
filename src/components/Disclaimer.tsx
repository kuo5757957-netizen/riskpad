export function Disclaimer() {
  return (
    <section id="disclaimer" aria-labelledby="disclaimer-title" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <div className="rounded-2xl border border-line border-l-2 border-l-gold bg-panel p-5 sm:p-7">
          <h2 id="disclaimer-title" className="text-xl font-medium tracking-tight">
            使用聲明
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted sm:text-base">
            <p>
              本站僅供教育用途與自行試算，用來理解倉位、停損與風險報酬的關係。內容非投資建議、非代操，也不提供買賣訊號或收益承諾。
            </p>
            <p>
              槓桿與合約交易可能在短時間內損失全部保證金。約略強平價使用簡化公式，與各交易所的檔位保證金、手續費、資金費率與標記價格不同。下單前請以交易所顯示的數字為準。
            </p>
            <p>所有計算都在你的瀏覽器內完成。RiskPad 沒有帳號系統，也不會把你輸入的價格上傳到伺服器。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
