jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Permissions } from '@common/decorators/permission.decorator';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { AdminPlansController } from './admin-plans.controller';

describe('AdminPlansController', () => {
  let controller: AdminPlansController;
  let saasClient: { send: jest.Mock };

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPlansController],
      providers: [{ provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient }],
    }).compile();
    controller = module.get(AdminPlansController);
  });

  it('forwards plan create to SaaS plan TCP message', async () => {
    await firstValueFrom(
      controller.create(
        {
          code: 'BASIC',
          name: 'Basic',
          priceVnd: 299000,
          billingPeriod: 'MONTHLY',
          maxTables: 50,
          maxStaff: 20,
          maxOrdersPerDay: 1000,
          features: ['basic_pos'],
        },
        'pid-1',
        {} as Request,
      ),
    );

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PLAN.CREATE,
      expect.objectContaining({ data: expect.objectContaining({ code: 'BASIC' }) }),
    );
  });

  it('attaches plan permissions', () => {
    const reflector = new Reflector();

    expect(reflector.get(Permissions, AdminPlansController.prototype.list)).toEqual([PERMISSION.PLAN_READ]);
    expect(reflector.get(Permissions, AdminPlansController.prototype.remove)).toEqual([PERMISSION.PLAN_DELETE]);
  });
});
