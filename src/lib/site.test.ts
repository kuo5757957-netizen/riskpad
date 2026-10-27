import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSiteUrl, normalizeBasePath } from './site';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normalizeBasePath', () => {
  it('accepts a project Pages path and ignores an empty root', () => {
    expect(normalizeBasePath(undefined)).toBe('');
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
    expect(normalizeBasePath('riskpad')).toBe('/riskpad');
    expect(normalizeBasePath('/riskpad')).toBe('/riskpad');
    expect(normalizeBasePath('/riskpad/')).toBe('/riskpad');
  });
});

describe('getSiteUrl', () => {
  it('uses the configured site url without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://kuo5757957-netizen.github.io/riskpad/');
    expect(getSiteUrl()).toBe('https://kuo5757957-netizen.github.io/riskpad');
  });

  it('falls back to the project Pages url from the base path', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/riskpad');
    expect(getSiteUrl()).toBe('https://kuo5757957-netizen.github.io/riskpad');
  });

  it('defaults to the riskpad project site when no env is set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
    expect(getSiteUrl()).toBe('https://kuo5757957-netizen.github.io/riskpad');
  });
});
