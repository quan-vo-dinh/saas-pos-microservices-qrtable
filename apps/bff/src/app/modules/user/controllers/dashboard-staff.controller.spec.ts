jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION, ROLE } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { DashboardStaffController } from './dashboard-staff.controller';

describe('DashboardStaffController', () => {
  let controller: DashboardStaffController;
  let userAccessClient: { send: jest.Mock };

  const ownerRequest = {
    [MetadataKey.TENANT_ID]: 'tenant-1',
    [MetadataKey.USER_DATA]: {
      metadata: {
        userId: 'owner-1',
        user: { roles: [{ name: ROLE.OWNER }] },
        permissions: [PERMISSION.USER_CREATE, PERMISSION.USER_GET_ALL, PERMISSION.USER_UPDATE, PERMISSION.USER_DELETE],
      },
    },
  } as unknown as Request;

  const managerRequest = {
    [MetadataKey.TENANT_ID]: 'tenant-1',
    [MetadataKey.USER_DATA]: {
      metadata: {
        userId: 'manager-1',
        user: { roles: [{ name: ROLE.MANAGER }] },
        permissions: [PERMISSION.USER_CREATE, PERMISSION.USER_GET_ALL, PERMISSION.USER_UPDATE, PERMISSION.USER_DELETE],
      },
    },
  } as unknown as Request;

  beforeEach(async () => {
    userAccessClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardStaffController],
      providers: [{ provide: TCP_SERVICES.USER_ACCESS_SERVICE, useValue: userAccessClient }],
    }).compile();
    controller = module.get(DashboardStaffController);
  });

  it('forwards create staff with tenant and actor context', async () => {
    await firstValueFrom(
      controller.create(
        {
          email: 'waiter@example.com',
          firstName: 'Waiter',
          lastName: 'One',
          roleName: ROLE.WAITER,
          password: 'Password123!',
          requirePasswordUpdate: true,
        },
        'pid-1',
        ownerRequest,
      ),
    );

    expect(userAccessClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.STAFF_CREATE,
      expect.objectContaining({
        processId: 'pid-1',
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          requestedByUserId: 'owner-1',
          requestedByRoles: [ROLE.OWNER],
          email: 'waiter@example.com',
          firstName: 'Waiter',
          lastName: 'One',
          roleName: ROLE.WAITER,
          password: 'Password123!',
          requirePasswordUpdate: true,
        }),
      }),
    );
  });

  it('forwards list query with tenant and actor context', async () => {
    await firstValueFrom(
      controller.list(
        { search: 'wait', roleName: ROLE.WAITER, status: 'ACTIVE', page: 1, limit: 20 },
        'pid-1',
        ownerRequest,
      ),
    );

    expect(userAccessClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.STAFF_LIST,
      expect.objectContaining({
        processId: 'pid-1',
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          requestedByUserId: 'owner-1',
          requestedByRoles: [ROLE.OWNER],
          search: 'wait',
          roleName: ROLE.WAITER,
          status: 'ACTIVE',
          page: 1,
          limit: 20,
        }),
      }),
    );
  });

  it('rejects role change when actor is not owner', () => {
    expect(() => controller.changeRole('staff-1', { roleName: ROLE.CHEF }, 'pid-1', managerRequest)).toThrow(
      BusinessException,
    );

    try {
      controller.changeRole('staff-1', { roleName: ROLE.CHEF }, 'pid-1', managerRequest);
    } catch (error) {
      expect((error as BusinessException).errorCode).toBe(ErrorCode.AUTH_PERMISSION_DENIED);
      expect((error as BusinessException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }

    expect(userAccessClient.send).not.toHaveBeenCalled();
  });

  it('rejects disable when actor is not owner', () => {
    expect(() => controller.disable('staff-1', { reason: 'left restaurant' }, 'pid-1', managerRequest)).toThrow(
      BusinessException,
    );

    try {
      controller.disable('staff-1', { reason: 'left restaurant' }, 'pid-1', managerRequest);
    } catch (error) {
      expect((error as BusinessException).errorCode).toBe(ErrorCode.AUTH_PERMISSION_DENIED);
    }

    expect(userAccessClient.send).not.toHaveBeenCalled();
  });

  it('rejects enable when actor is not owner', () => {
    expect(() => controller.enable('staff-1', { reason: 're-enabled' }, 'pid-1', managerRequest)).toThrow(
      BusinessException,
    );

    try {
      controller.enable('staff-1', { reason: 're-enabled' }, 'pid-1', managerRequest);
    } catch (error) {
      expect((error as BusinessException).errorCode).toBe(ErrorCode.AUTH_PERMISSION_DENIED);
    }

    expect(userAccessClient.send).not.toHaveBeenCalled();
  });

  it('forwards role change when actor is owner', async () => {
    await firstValueFrom(controller.changeRole('staff-1', { roleName: ROLE.CHEF }, 'pid-1', ownerRequest));

    expect(userAccessClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.STAFF_CHANGE_ROLE,
      expect.objectContaining({
        processId: 'pid-1',
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          requestedByUserId: 'owner-1',
          requestedByRoles: [ROLE.OWNER],
          userId: 'staff-1',
          roleName: ROLE.CHEF,
        }),
      }),
    );
  });

  it('forwards disable when actor is owner', async () => {
    await firstValueFrom(controller.disable('staff-1', { reason: 'left restaurant' }, 'pid-1', ownerRequest));

    expect(userAccessClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          enabled: false,
          reason: 'left restaurant',
        }),
      }),
    );
  });

  it('forwards enable when actor is owner', async () => {
    await firstValueFrom(controller.enable('staff-1', { reason: 're-enabled' }, 'pid-1', ownerRequest));

    expect(userAccessClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          enabled: true,
          reason: 're-enabled',
        }),
      }),
    );
  });
});
