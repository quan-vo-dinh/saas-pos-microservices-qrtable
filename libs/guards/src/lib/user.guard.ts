import { Injectable, CanActivate, ExecutionContext, Inject, Logger, HttpStatus } from '@nestjs/common';
import { firstValueFrom, Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { MetadataKey } from '@common/constants/common.constant';
import { getAccessToken, setUserData } from '@common/utils/request.util';
import { getProcessId } from '@common/utils/string.util';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { GRPC_SERVICES } from '@common/configuration/grpc.config';
import { ClientGrpc } from '@nestjs/microservices';
import { AuthorizerService } from '@common/interfaces/grpc/authorizer/index';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
@Injectable()
export class UserGuard implements CanActivate {
  private readonly logger = new Logger(UserGuard.name);
  private authorizerService: AuthorizerService;

  constructor(
    private readonly reflector: Reflector,
    @Inject(GRPC_SERVICES.AUTHORIZER_SERVICE) private readonly grpcAuthorizerClient: ClientGrpc,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  onModuleInit() {
    this.authorizerService = this.grpcAuthorizerClient.getService<AuthorizerService>('AuthorizerService');
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const authOptions = this.reflector.getAllAndOverride<{ secured: boolean }>(MetadataKey.SECURED, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Record<string, unknown>>();

    if (!authOptions?.secured) {
      return true;
    }

    return this.verifyUserToken(req);
  }

  private async verifyUserToken(req: Record<string, unknown>): Promise<boolean> {
    try {
      const token = getAccessToken(req);
      this.logger.debug('Verifying user token');

      if (!token) {
        throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
      }

      const cacheKey = this.generateTokenCacheKey(token);

      const processIdValue = req[MetadataKey.PROCESSID];
      const processId = typeof processIdValue === 'string' && processIdValue ? processIdValue : getProcessId('qrtable');
      const cacheData = await this.cacheManager.get<AuthorizeResponse>(cacheKey);

      if (cacheData) {
        setUserData(req, cacheData);
        return true;
      }
      req[MetadataKey.PROCESSID] = processId;

      const response = await firstValueFrom(
        this.authorizerService.verifyUserToken({
          processId,
          token,
        }),
      );
      this.logger.debug({ response });
      const { data: result } = response;

      if (!result?.valid) {
        throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
      }
      this.logger.debug(`Set user data to cache for cache key: ${cacheKey}`);

      setUserData(req, result);
      this.cacheManager.set(cacheKey, result, 30 * 60 * 1000);

      return true;
    } catch (error) {
      this.logger.error({ error });

      const errorDetails = this.getErrorDetails(error);

      if (errorDetails?.includes('USER_NOT_PROVISIONED') || errorDetails?.includes('ROLE_MAPPING_MISMATCH')) {
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED);
      }

      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
    }
  }

  generateTokenCacheKey(token: string): string {
    const hash = createHash('sha256').update(token).digest('hex');
    return `user-token:${hash}`;
  }

  private getErrorDetails(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const errorDetails = (error as { details?: unknown }).details;
    if (typeof errorDetails === 'string') {
      return errorDetails;
    }

    const errorMessage = (error as { message?: unknown }).message;
    if (typeof errorMessage === 'string') {
      return errorMessage;
    }

    return undefined;
  }
}
