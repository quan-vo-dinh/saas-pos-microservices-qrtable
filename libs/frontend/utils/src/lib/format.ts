const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(amount: number): string {
  return VND_FORMATTER.format(amount);
}

export function formatDate(dateString: string): string {
  return DATE_FORMATTER.format(new Date(dateString));
}

export function formatTime(dateString: string): string {
  return TIME_FORMATTER.format(new Date(dateString));
}
