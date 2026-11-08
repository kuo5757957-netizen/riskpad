/** Project Pages base path. Empty string means the site is served at the host root. */
export function normalizeBasePath(raw: string | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

/** Absolute site origin plus base path, without a trailing slash. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  return `https://kuo5757957-netizen.github.io${basePath || '/riskpad'}`;
}

/** Root-relative URL for a static file outside the Next router, including the Pages base path. */
export function withBasePath(path: string): string {
  const base = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
