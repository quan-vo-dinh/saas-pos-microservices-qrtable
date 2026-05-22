jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { PublicSaasController } from './public-saas.controller';

describe('PublicSaasController', () => {
  let controller: PublicSaasController;
  let saasClient: { send: jest.Mock };

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success([{ code: 'FREE' }]))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSaasController],
      providers: [
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'BFF_PLATFORM_CONFIG.PLATFORM_CONTACT_EMAIL' ? 'support@qrtable.local' : undefined,
            ),
          },
        },
      ],
    }).compile();
    controller = module.get(PublicSaasController);
  });

  it('calls SaaS client without auth guard metadata for public plans', async () => {
    const result = await firstValueFrom(controller.listPublicPlans('pid-1'));

    expect(saasClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE, { processId: 'pid-1' });
    expect(result.data).toEqual([{ code: 'FREE' }]);
  });

  it('returns landing info without reading secret env vars', () => {
    const result = controller.getLandingInfo('pid-1');

    expect(result.data).toMatchObject({
      productName: 'QRTable',
      market: 'Vietnamese F&B SaaS POS',
    });
  });
});
