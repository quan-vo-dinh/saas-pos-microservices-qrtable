jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Permissions } from '@common/decorators/permission.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { TenantStatusActionDtoValue } from '../dtos/admin-tenant.dto';
import { AdminTenantsController } from './admin-tenants.controller';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

describe('AdminTenantsController', () => {
  let controller: AdminTenantsController;
  let saasClient: { send: jest.Mock };
  let realtimeEvents: { emitTenantLifecycle: jest.Mock };

  const req = (permissions: PERMISSION[] = Object.values(PERMISSION)) =>
    ({
      [MetadataKey.USER_DATA]: {
        metadata: {
          userId: 'admin-user-1',
          permissions,
        },
      },
    }) as unknown as Request;

  beforeEach(async () => {
    realtimeEvents = { emitTenantLifecycle: jest.fn() };
    saasClient = {
      send: jest.fn().mockImplementation((pattern: unknown) => {
        if (pattern === TCP_REQUEST_MESSAGE.TENANT.SUSPEND) {
          return of({ statusCode: 200, code: 'OK', data: true });
        }
        if (pattern === TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID) {
          return of({
            statusCode: 200,
            code: 'OK',
            data: {
              id: 'tenant-1',
              slug: 'tenant-slug',
              name: 'Tenant',
              status: 'SUSPENDED',
              isActive: false,
              suspendedReason: 'expired',
              defaultCurrency: 'VND',
              defaultLocale: 'vi-VN',
              createdAt: '',
              updatedAt: '',
            },
          });
        }
        return of(Response.success({ ok: true }));
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTenantsController],
      providers: [
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
        { provide: RealtimeEventsService, useValue: realtimeEvents },
      ],
    }).compile();
    controller = module.get(AdminTenantsController);
  });

  it('forwards createdByUserId for onboarding', async () => {
    await firstValueFrom(
      controller.onboard(
        {
          tenantName: 'Tenant A',
          initialPlanCode: 'FREE',
          ownerEmail: 'owner@example.com',
          ownerPassword: 'Password123!',
          ownerFirstName: 'A',
          ownerLastName: 'Owner',
        },
        'pid-1',
        req(),
      ),
    );

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.TENANT.ONBOARD,
      expect.objectContaining({
        processId: 'pid-1',
        data: expect.objectContaining({ createdByUserId: 'admin-user-1', ownerPassword: 'Password123!' }),
      }),
    );
  });

  it('uses action-specific permission for tenant status updates', async () => {
    await firstValueFrom(
      controller.updateStatus(
        'tenant-1',
        { action: TenantStatusActionDtoValue.SUSPEND, reason: 'expired' },
        'pid-1',
        req([PERMISSION.TENANT_SUSPEND]),
      ),
    );

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.TENANT.SUSPEND,
      expect.objectContaining({
        data: expect.objectContaining({ id: 'tenant-1', requestedByUserId: 'admin-user-1' }),
      }),
    );
    expect(realtimeEvents.emitTenantLifecycle).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        tenantSlug: 'tenant-slug',
        eventName: expect.any(String),
      }),
    );
  });

  it('blocks status updates when the action permission is missing', () => {
    expect(() =>
      controller.updateStatus(
        'tenant-1',
        { action: TenantStatusActionDtoValue.CLOSE },
        'pid-1',
        req([PERMISSION.TENANT_SUSPEND]),
      ),
    ).toThrow(BusinessException);

    try {
      controller.updateStatus(
        'tenant-1',
        { action: TenantStatusActionDtoValue.CLOSE },
        'pid-1',
        req([PERMISSION.TENANT_SUSPEND]),
      );
    } catch (error) {
      expect((error as BusinessException).errorCode).toBe(ErrorCode.AUTH_PERMISSION_DENIED);
    }
  });

  it('attaches expected permission metadata on admin routes', () => {
    const reflector = new Reflector();

    expect(reflector.get(Permissions, AdminTenantsController.prototype.onboard)).toEqual([PERMISSION.TENANT_ONBOARD]);
    expect(reflector.get(Permissions, AdminTenantsController.prototype.list)).toEqual([PERMISSION.TENANT_LIST_ALL]);
  });
});
