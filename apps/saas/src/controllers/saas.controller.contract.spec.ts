import 'reflect-metadata';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { SaasController } from './saas.controller';

function messagePatterns(controller: { prototype: object }): unknown[] {
  const prototype = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .flatMap((name) => {
      const handler = prototype[name];
      return typeof handler === 'function' ? (Reflect.getMetadata(PATTERN_METADATA, handler) ?? []) : [];
    });
}

describe('SaasController Phase 4B TCP contracts', () => {
  it('exposes every SaaS TCP pattern used by Phase 4B BFF routes', () => {
    expect(messagePatterns(SaasController)).toEqual(
      expect.arrayContaining([
        TCP_REQUEST_MESSAGE.TENANT.GET_PLATFORM_STATS,
        TCP_REQUEST_MESSAGE.TENANT.LIST,
        TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID,
        TCP_REQUEST_MESSAGE.TENANT.UPDATE,
        TCP_REQUEST_MESSAGE.TENANT.SUSPEND,
        TCP_REQUEST_MESSAGE.TENANT.ACTIVATE,
        TCP_REQUEST_MESSAGE.TENANT.CLOSE,
        TCP_REQUEST_MESSAGE.TENANT.GET_USAGE,
        TCP_REQUEST_MESSAGE.TENANT.GET_AUDIT,
        TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE,
        TCP_REQUEST_MESSAGE.PLAN.LIST,
        TCP_REQUEST_MESSAGE.PLAN.CREATE,
        TCP_REQUEST_MESSAGE.PLAN.UPDATE,
        TCP_REQUEST_MESSAGE.PLAN.DELETE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_HISTORY,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.ASSIGN,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_INVOICES,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.HANDLE_WEBHOOK,
      ]),
    );
  });

  it('preserves top-level TCP processId during onboarding', async () => {
    const onboardingSagaService = { onboard: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }) };
    const controller = new SaasController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      onboardingSagaService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await controller.onboard(
      {
        name: 'Pho Ha Noi',
        type: 'RESTAURANT',
        ownerEmail: 'owner@example.test',
        ownerPassword: 'Password123!',
        ownerFirstName: 'Owner',
        ownerLastName: 'One',
        createdByUserId: 'admin-1',
      },
      'process-1',
    );

    expect(onboardingSagaService.onboard).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantName: 'Pho Ha Noi',
        processId: 'process-1',
      }),
    );
  });
});
