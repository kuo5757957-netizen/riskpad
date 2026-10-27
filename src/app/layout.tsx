import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource-variable/noto-sans-tc';
import { DisclaimerBanner } from '@/components/Disclaimer';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/site';
import './globals.css';

const siteUrl = getSiteUrl();
const title = 'RiskPad｜倉位風險計算機：合約倉位計算與風險報酬比';
const description =
  '免費倉位風險計算機，在瀏覽器計算合約倉位大小、風險報酬比與約略強平價。不提供訊號、不需帳號。教育用途，非投資建議、非代操。';

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title,
  description,
  applicationName: 'RiskPad',
  keywords: ['合約倉位計算', '倉位風險計算機', '風險報酬比計算', '約略強平價', '倉位管理', 'RiskPad'],
  alternates: {
    canonical: `${siteUrl}/`,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: `${siteUrl}/`,
    siteName: 'RiskPad',
    title,
    description,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0e0c',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'RiskPad',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  inLanguage: 'zh-TW',
  url: `${siteUrl}/`,
  description,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body className="bg-bg font-sans text-ink antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <noscript>
          <p className="bg-gold px-5 py-2 text-center text-sm text-[#1a1408]">
            改數字即時試算需要 JavaScript。計算在你的瀏覽器裡進行，不會把數字送到伺服器。
          </p>
        </noscript>
        <SiteHeader />
        <DisclaimerBanner />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
