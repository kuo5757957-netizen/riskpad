import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-muted sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-ink">RiskPad</p>
          <p className="mt-1">交易倉位與風險計算</p>
          <p className="mt-1">教育用途 · 非投資建議 · 非代操</p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Link href="/#disclaimer" className="hover:text-ink">
            免責聲明
          </Link>
          <p>計算在你的瀏覽器內完成。</p>
        </div>
      </div>
    </footer>
  );
}
