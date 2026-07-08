export const paymentKeys = {
  history: (billId?: string) => ['payment', 'history', billId ?? 'all'] as const,
};
