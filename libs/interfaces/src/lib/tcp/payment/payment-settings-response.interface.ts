import type { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';

export type SepayBankAccountTcpResponse = {
  uuid: string;
  bankShortName: string;
  accountNumber: string;
  accountHolder: string;
  balance?: number;
};

export type TenantPaymentSettingsTcpResponse = {
  tenantId: string;
  cashEnabled: boolean;
  vietqrEnabled: boolean;
  connectionStatus: TenantPaymentConnectionStatus;
  bankShortName?: string | null;
  accountNumberMasked?: string | null;
  accountHolder?: string | null;
  webhookVerifiedAt?: string | null;
  lastError?: string | null;
};

export type GeneratePaymentAuthorizeUrlTcpResponse = {
  authorizeUrl: string;
  expiresInSeconds: number;
};

export type HandlePaymentOAuthCallbackTcpResponse = {
  banks: SepayBankAccountTcpResponse[];
  tokenExpiresAt: string;
};

export type SelectBankTcpResponse = {
  status: 'CONNECTED';
  bankShortName: string;
  accountNumberMasked: string;
  accountHolder: string;
};
