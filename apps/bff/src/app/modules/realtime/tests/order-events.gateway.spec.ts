jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { ROLE } from '@common/constants/enum/role.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { PreparationStation } from '@einvoice/types';
import type { Socket } from 'socket.io';
import { OrderEventsGateway } from '../gateways/order-events.gateway';
import { RealtimeAuthService } from '../services/realtime-auth.service';

describe('OrderEventsGateway', () => {
  let gateway: OrderEventsGateway;

  const auth = {
    resolveConnectionRooms: jest.fn(),
  };

  beforeEach(async () => {
    auth.resolveConnectionRooms.mockResolvedValue(['tenant:t1:staff']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderEventsGateway, { provide: RealtimeAuthService, useValue: auth }],
    }).compile();

    gateway = module.get(OrderEventsGateway);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as never;
  });

  it('handleConnection joins server-derived rooms only', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const socket = {
      handshake: { auth: { token: 'x' }, headers: {} },
      join,
      disconnect: jest.fn(),
      emit: jest.fn(),
      data: {},
    } as unknown as Socket;

    await gateway.handleConnection(socket);

    expect(auth.resolveConnectionRooms).toHaveBeenCalledWith(socket);
    expect(join).toHaveBeenCalledWith('tenant:t1:staff');
  });

  it('subscribe.kds lets OWNER join station room', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const socket = {
      data: { tenantId: 't1', staffRoles: [ROLE.OWNER] },
      emit: jest.fn(),
      join,
    } as unknown as Socket;

    gateway.subscribeKds(socket, { station: PreparationStation.KITCHEN });

    expect(join).toHaveBeenCalledWith('tenant:t1:kds:kitchen');
  });

  it('join.session emits auth error without joining client-supplied rooms', () => {
    const socket = { emit: jest.fn(), join: jest.fn() } as unknown as Socket;
    gateway.joinSessionLegacy(socket);
    expect(socket.emit).toHaveBeenCalledWith('events.authError', expect.any(Object));
    expect((socket.join as jest.Mock).mock.calls.length).toBe(0);
  });

  it('join.staff emits auth error without joining client-supplied rooms', () => {
    const socket = { emit: jest.fn(), join: jest.fn() } as unknown as Socket;
    gateway.joinStaffLegacy(socket);
    expect(socket.emit).toHaveBeenCalledWith('events.authError', expect.any(Object));
    expect((socket.join as jest.Mock).mock.calls.length).toBe(0);
  });
});
