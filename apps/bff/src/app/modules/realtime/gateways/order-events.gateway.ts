import { ROLE } from '@common/constants/enum/role.enum';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { PreparationStation } from '@einvoice/types';
import { Server, Socket } from 'socket.io';
import { RealtimeAuthService } from '../services/realtime-auth.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
export class OrderEventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrderEventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: RealtimeAuthService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const rooms = await this.auth.resolveConnectionRooms(socket);
      for (const room of rooms) {
        await socket.join(room);
      }
    } catch (e) {
      this.logger.warn(`WS rejected: ${(e as Error).message}`);
      socket.emit('events.authError', { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('join.session')
  joinSessionLegacy(@ConnectedSocket() socket: Socket): void {
    socket.emit('events.authError', {
      message:
        'Room assignment is server-managed; send handshake.auth.tenantId and handshake.auth.sessionId (x-tenant-id / x-session-id headers remain supported as a transitional fallback).',
    });
  }

  @SubscribeMessage('join.staff')
  joinStaffLegacy(@ConnectedSocket() socket: Socket): void {
    socket.emit('events.authError', {
      message:
        'Room assignment is server-managed; authenticate with handshake.auth.token or Authorization: Bearer on the handshake.',
    });
  }

  @SubscribeMessage('subscribe.kds')
  subscribeKds(@ConnectedSocket() socket: Socket, @MessageBody() body: { station?: PreparationStation }): void {
    const tenantId = socket.data.tenantId as string | undefined;
    const roles = (socket.data.staffRoles as string[] | undefined) ?? [];
    if (!tenantId || !body?.station) {
      socket.emit('events.authError', { message: 'Invalid subscribe.kds payload' });
      return;
    }

    const allowed = roles.includes(ROLE.SUPER_ADMIN) || roles.includes(ROLE.OWNER) || roles.includes(ROLE.MANAGER);
    if (!allowed) {
      socket.emit('events.authError', { message: 'Forbidden' });
      return;
    }

    const room = body.station === 'KITCHEN' ? `tenant:${tenantId}:kds:kitchen` : `tenant:${tenantId}:kds:bar`;
    void socket.join(room);
  }
}
