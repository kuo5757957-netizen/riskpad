import Link from 'next/link';

const links = [
  { href: '/#position', label: '倉位大小' },
  { href: '/#reward', label: '風險報酬比' },
  { href: '/#liquidation', label: '約略強平價' },
  { href: '/#howto', label: '使用方式' },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-30 focus:rounded-md focus:bg-panel focus:px-3 focus:py-2"
      >
        跳至內容
      </a>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#e0b15a" />
            <path
              d="M9 23.2V8.8h2.7l4.3 7.2 4.3-7.2H23v14.4h-2.3v-9.2L17 20.6h-1.4l-3.7-6.6v9.2H9z"
              fill="#16140e"
            />
          </svg>
          <span className="text-[15px] font-medium tracking-wide">RiskPad</span>
        </Link>
        <nav aria-label="頁面" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
