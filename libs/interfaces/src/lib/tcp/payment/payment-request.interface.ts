export type CreateVietQrTcpRequest = {
  tenantId: string;
  billId: string;
  userId: string;
  processId?: string;
};

export type ConfirmCashTcpRequest = {
  tenantId: string;
  billId: string;
  userId: string;
  amountReceived: number;
  processId?: string;
};

export type SepayWebhookPayload = {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
};

export type HandleSepayWebhookTcpRequest = {
  payload: SepayWebhookPayload;
  tenantSlug?: string;
  secret?: string;
  processId?: string;
};

export type PaymentHistoryTcpRequest = {
  tenantId: string;
  billId?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type PaymentByIdTcpRequest = {
  tenantId: string;
  paymentId: string;
};
