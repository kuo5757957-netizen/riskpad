import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-24">
      <p className="font-mono text-xs tracking-[0.18em] text-gold">404</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">找不到這個頁面</h1>
      <p className="mt-3 text-muted">RiskPad 只有這一頁試算工具。</p>
      <Link href="/" className="mt-6 inline-block text-sm text-gold-soft underline-offset-4 hover:underline">
        回首頁
      </Link>
    </main>
  );
}
