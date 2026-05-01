import { buildCustomerQrUrl } from '../qr-url';

describe('buildCustomerQrUrl', () => {
  it('encodes tenant, table, and token query params', () => {
    const url = buildCustomerQrUrl({
      baseUrl: 'http://localhost:5173',
      tenantSlug: 'acme-diner',
      tableId: 'tbl-1',
      qrToken: 'ab'.repeat(32),
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('http://localhost:5173/');
    expect(parsed.searchParams.get('tenant')).toBe('acme-diner');
    expect(parsed.searchParams.get('table')).toBe('tbl-1');
    expect(parsed.searchParams.get('token')).toBe('ab'.repeat(32));
  });

  it('adds https when base URL has no scheme', () => {
    const url = buildCustomerQrUrl({
      baseUrl: 'demo.local:5173',
      tenantSlug: 'x',
      tableId: 't1',
      qrToken: 'aa'.repeat(32),
    });
    expect(url.startsWith('https://demo.local:5173')).toBe(true);
  });
});
