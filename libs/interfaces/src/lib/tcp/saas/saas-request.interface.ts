import { CreateTenantRequestDto, UpdateTenantRequestDto } from '../../gateway/saas';
import type { SepayWebhookPayload } from '../payment';

export type CreateTenantTcpRequest = CreateTenantRequestDto;

export type OnboardTenantTcpRequest = {
  name: string;
  type: 'CAFE' | 'RESTAURANT' | 'PUB' | 'OTHER';
  address?: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  planCode?: string;
  createdByUserId: string;
  processId?: string;
};

export type GetTenantByIdTcpRequest = {
  id: string;
};

export type GetTenantBySlugTcpRequest = {
  slug: string;
};

export type UpdateTenantTcpRequest = UpdateTenantRequestDto & {
  id: string;
};

export type DeleteTenantTcpRequest = {
  id: string;
};

export type CheckoutInvoiceTcpRequest = {
  tenantId: string;
  planCode: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  requestedByUserId: string;
  processId?: string;
};

export type HandleSubscriptionWebhookTcpRequest = {
  payload: SepayWebhookPayload;
  processId?: string;
};
