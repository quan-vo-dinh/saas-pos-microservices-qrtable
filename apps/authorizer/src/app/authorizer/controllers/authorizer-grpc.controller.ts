import { status } from '@grpc/grpc-js';
import { Controller, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthorizerService } from '../services/authorizer.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { VerifyUserTokenRequest, VerifyUserTokenResponse } from '@common/interfaces/grpc/authorizer';
import { Response } from '@common/interfaces/grpc/common/response.interface';
import { BusinessException } from '@common/error-messages/business.exception';

@Controller()
export class AuthorizerGrpcController {
  private readonly logger = new Logger(AuthorizerGrpcController.name);

  constructor(private readonly authorizerService: AuthorizerService) {}

  @GrpcMethod('AuthorizerService', 'verifyUserToken')
  async verifyUserToken(params: VerifyUserTokenRequest): Promise<VerifyUserTokenResponse> {
    try {
      const result = await this.authorizerService.verifyUserToken(params.token, params.processId);
      return Response.success(result);
    } catch (error) {
      this.logger.error({ error, processId: params?.processId });

      if (error instanceof BusinessException) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: error.message,
        });
      }

      if (error instanceof UnauthorizedException) {
        throw new RpcException({
          code: status.UNAUTHENTICATED,
          message: error.message,
        });
      }

      throw new RpcException({
        code: status.INTERNAL,
        message: 'Internal server error',
      });
    }
  }
}
