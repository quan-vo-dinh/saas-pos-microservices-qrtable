const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatVnd(amount: number) {
  return formatter.format(amount);
}
