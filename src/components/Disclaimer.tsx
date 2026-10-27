import Link from 'next/link';

export function DisclaimerBanner() {
  return (
    <aside aria-label="免責聲明" className="border-b border-gold/40 bg-[#2a2416] text-gold-soft">
      <p className="mx-auto max-w-6xl px-5 py-2.5 text-sm leading-6">
        <span className="font-medium text-gold">免責聲明。</span>
        只做倉位與風險試算，不構成投資建議，不保證獲利。強平價是近似值，實際以交易所為準。交易可能虧損全部本金。{' '}
        <Link href="/#disclaimer" className="underline decoration-gold/40 underline-offset-4 hover:text-ink">
          完整說明
        </Link>
      </p>
    </aside>
  );
}

export function Disclaimer() {
  return (
    <section id="disclaimer" aria-labelledby="disclaimer-title" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <div className="rounded-2xl border border-line border-l-2 border-l-gold bg-panel p-5 sm:p-7">
          <h2 id="disclaimer-title" className="text-xl font-medium tracking-tight">
            免責聲明
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted sm:text-base">
            <p>
              本站僅供教育用途與自行試算，用來理解倉位、停損與風險報酬的關係。內容非投資建議、非代操，不保證獲利，也不提供買賣訊號或收益承諾。
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
