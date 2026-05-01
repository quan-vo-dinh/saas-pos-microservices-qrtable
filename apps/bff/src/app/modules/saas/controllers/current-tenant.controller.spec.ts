jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of } from 'rxjs';
import { CurrentTenantController } from './current-tenant.controller';

describe('CurrentTenantController', () => {
  let controller: CurrentTenantController;
  let saasClient: { send: jest.Mock };

  beforeEach(async () => {
    saasClient = {
      send: jest.fn().mockReturnValue(
        of(
          Response.success({
            id: 'tenant-id',
            slug: 'tenant_a',
            name: 'Tenant A',
            isActive: true,
          }),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrentTenantController],
      providers: [{ provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient }],
    }).compile();

    controller = module.get(CurrentTenantController);
  });

  it('resolves legacy string tenant keys by slug instead of UUID id', () => {
    const req = { [MetadataKey.TENANT_ID]: 'tenant_a' } as unknown as Request;

    controller.getCurrent('pid-1', req);

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SAAS.GET_BY_SLUG,
      expect.objectContaining({
        processId: 'pid-1',
        data: { slug: 'tenant_a' },
      }),
    );
  });

  it('resolves UUID tenant identifiers by id', () => {
    const tenantId = '3d8c41a4-27f2-42ac-8c5b-a8420f17c2d4';
    const req = { [MetadataKey.TENANT_ID]: tenantId } as unknown as Request;

    controller.getCurrent('pid-1', req);

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID,
      expect.objectContaining({
        processId: 'pid-1',
        data: { id: tenantId },
      }),
    );
  });
});
