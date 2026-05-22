import { GRPC_SERVICES } from '@common/configuration/grpc.config';
import { ROLE } from '@common/constants/enum/role.enum';
import { WsRoom } from '@common/constants/ws-room.constants';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { AuthorizerService } from '@common/interfaces/grpc/authorizer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { createHash, randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import type { Socket } from 'socket.io';
import { getSessionCacheKey } from '@common/utils/request.util';
import { extractJwtRealmRoles, extractJwtTenantId } from '../../authorizer/utils/jwt-metadata.util';

function getHandshakeHeader(headers: Record<string, unknown>, name: string): string | undefined {
  const lower = name.toLowerCase();
  const direct = (headers[lower] as string | string[] | undefined) ?? (headers[name] as string | string[] | undefined);
  if (Array.isArray(direct)) {
    return direct[0]?.trim();
  }
  return typeof direct === 'string' ? direct.trim() : undefined;
}

function getHandshakeAuthString(auth: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!auth) {
    return undefined;
  }
  const raw = auth[name];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

@Injectable()
export class RealtimeAuthService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeAuthService.name);
  private authorizer!: AuthorizerService;

  constructor(
    @Inject(GRPC_SERVICES.AUTHORIZER_SERVICE) private readonly grpcAuthorizer: ClientGrpc,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  onModuleInit(): void {
    this.authorizer = this.grpcAuthorizer.getService<AuthorizerService>('AuthorizerService');
  }

  /**
   * Validates handshake and returns server-derived Socket.IO rooms (staff JWT or customer session).
   */
  async resolveConnectionRooms(socket: Socket): Promise<string[]> {
    const authToken =
      (socket.handshake.auth?.token as string | undefined)?.trim() ||
      this.extractBearer(socket.handshake.headers.authorization);

    if (authToken) {
      const user = await this.verifyStaffToken(authToken);
      return this.buildStaffRooms(socket, user);
    }

    const headers = socket.handshake.headers as Record<string, unknown>;
    const handshakeAuth = socket.handshake.auth as Record<string, unknown> | undefined;
    const tenantId = getHandshakeAuthString(handshakeAuth, 'tenantId') ?? getHandshakeHeader(headers, 'x-tenant-id');
    const sessionId = getHandshakeAuthString(handshakeAuth, 'sessionId') ?? getHandshakeHeader(headers, 'x-session-id');
    return this.buildCustomerRooms(socket, tenantId, sessionId);
  }

  private extractBearer(authHeader: unknown): string | undefined {
    if (typeof authHeader !== 'string') {
      return undefined;
    }
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    return m?.[1]?.trim();
  }

  private async verifyStaffToken(token: string): Promise<AuthorizeResponse> {
    const cacheKey = this.tokenCacheKey(token);
    const cached = await this.cacheManager.get<AuthorizeResponse>(cacheKey);
    if (cached?.valid) {
      return cached;
    }

    const response = await firstValueFrom(
      this.authorizer.verifyUserToken({
        processId: randomUUID(),
        token,
      }),
    );
    const result = response.data;
    if (!result?.valid) {
      throw new UnauthorizedException();
    }

    await this.cacheManager.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  }

  private tokenCacheKey(token: string): string {
    const hash = createHash('sha256').update(token).digest('hex');
    return `user-token:${hash}`;
  }

  private buildStaffRooms(socket: Socket, user: AuthorizeResponse): string[] {
    const jwt = user.metadata?.jwt;
    const headers = socket.handshake.headers as Record<string, unknown>;
    const headerTenant = getHandshakeHeader(headers, 'x-tenant-id');
    const tenantRaw = extractJwtTenantId(jwt) || headerTenant;
    const tenantId = tenantRaw?.trim();
    if (!tenantId) {
      this.logger.warn('Staff WS rejected: missing tenant on JWT and x-tenant-id');
      throw new UnauthorizedException();
    }

    const roles = extractJwtRealmRoles(jwt);
    const rooms = new Set<string>();
    rooms.add(WsRoom.staff(tenantId));
    if (roles.includes(ROLE.CHEF)) {
      rooms.add(WsRoom.kds(tenantId, 'KITCHEN'));
    }
    if (roles.includes(ROLE.BARISTA)) {
      rooms.add(WsRoom.kds(tenantId, 'BAR'));
    }
    if (roles.includes(ROLE.SUPER_ADMIN) || roles.includes(ROLE.OWNER) || roles.includes(ROLE.MANAGER)) {
      rooms.add(WsRoom.management(tenantId));
    }

    socket.data.staffRoles = roles;
    socket.data.tenantId = tenantId;

    return [...rooms];
  }

  private async buildCustomerRooms(
    socket: Socket,
    tenantId: string | undefined,
    sessionId: string | undefined,
  ): Promise<string[]> {
    if (!tenantId?.trim() || !sessionId?.trim()) {
      throw new UnauthorizedException();
    }
    const key = getSessionCacheKey(sessionId.trim(), tenantId.trim());
    const session = await this.cacheManager.get(key);
    if (!session) {
      throw new UnauthorizedException();
    }
    const tid = tenantId.trim();
    const sid = sessionId.trim();
    const rooms: string[] = [WsRoom.customer(sid), WsRoom.customers(tid)];
    const slug = getHandshakeAuthString(socket.handshake.auth as Record<string, unknown> | undefined, 'tenantSlug');
    if (slug?.trim()) {
      rooms.push(WsRoom.tenantSlugCustomers(slug.trim()));
    }
    return rooms;
  }
}
