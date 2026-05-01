export function buildCustomerQrUrl(params: {
  baseUrl: string;
  tenantSlug: string;
  tableId: string;
  qrToken: string;
}): string {
  const raw = params.baseUrl.trim() || 'http://localhost:5173';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withScheme);
  if (!u.pathname || u.pathname === '') {
    u.pathname = '/';
  }
  u.search = '';
  u.searchParams.set('tenant', params.tenantSlug);
  u.searchParams.set('table', params.tableId);
  u.searchParams.set('token', params.qrToken);
  return u.toString();
}
