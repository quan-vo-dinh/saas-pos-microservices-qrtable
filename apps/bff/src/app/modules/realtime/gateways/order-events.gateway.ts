import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
export class OrderEventsGateway {
  @WebSocketServer()
  server!: Server;

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('join.session')
  joinSession(@ConnectedSocket() socket: Socket, @MessageBody() body: { sessionId: string }): void {
    if (body?.sessionId) {
      void socket.join(`session:${body.sessionId}:customer`);
    }
  }

  @SubscribeMessage('join.staff')
  joinStaff(@ConnectedSocket() socket: Socket, @MessageBody() body: { tenantId: string }): void {
    if (body?.tenantId) {
      void socket.join(`tenant:${body.tenantId}:staff`);
    }
  }
}
