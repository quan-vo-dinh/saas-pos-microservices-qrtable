/** Locale/format helpers for SaaS screens. Domain enum labels → @einvoice/shared-constants. */
export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function formatQuota(value: number): string {
  return value === -1 ? 'Không giới hạn' : value.toLocaleString('vi-VN');
}

export function maskAccountNumber(raw: string | null | undefined): string {
  if (!raw) {
    return '—';
  }
  const digits = raw.replace(/\s/g, '');
  if (digits.length <= 4) {
    return '****';
  }
  return `****${digits.slice(-4)}`;
}
