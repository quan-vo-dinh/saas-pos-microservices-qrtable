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
  processId?: string;
};

export type RefundRequestTcpRequest = {
  tenantId: string;
  paymentId: string;
  userId: string;
  reason: string;
  customerBankAccount?: string;
  customerBankName?: string;
  customerAccountName?: string;
  processId?: string;
};

export type RefundConfirmTcpRequest = {
  tenantId: string;
  refundId: string;
  userId: string;
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
