export type PaymentSettingsByTenantTcpRequest = {
  tenantId: string;
  processId?: string;
};

export type CreateEmptyPaymentSettingsTcpRequest = {
  tenantId: string;
  processId?: string;
};

export type GeneratePaymentAuthorizeUrlTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  processId?: string;
};

export type HandlePaymentOAuthCallbackTcpRequest = {
  code: string;
  state: string;
  processId?: string;
};

export type SelectBankTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  sepayBankAccountUuid: string;
  webhookUrl: string;
  processId?: string;
};

export type DisconnectPaymentSettingsTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  processId?: string;
};
