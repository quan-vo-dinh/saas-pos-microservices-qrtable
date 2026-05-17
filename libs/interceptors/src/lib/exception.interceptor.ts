import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, map } from 'rxjs';
import { Request } from 'express';
import { MetadataKey } from '@common/constants/common.constant';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { BusinessException, BusinessExceptionResponse } from '@common/error-messages/business.exception';
import { transformDbError } from '@common/error-messages/db-error.transformer';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { getErrorMessage } from '@common/error-messages/error-messages.registry';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ExceptionInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request: Request & { [MetadataKey.PROCESSID]: string; [MetadataKey.STARTTIME]: number } = ctx.getRequest();
    const skipResponseWrapper = this.reflector.getAllAndOverride<boolean>(MetadataKey.SKIP_RESPONSE_WRAPPER, [
      context.getHandler(),
      context.getClass(),
    ]);

    const processID = request[MetadataKey.PROCESSID];
    const startTime = request[MetadataKey.STARTTIME];

    return next.handle().pipe(
      map((data: unknown) => {
        if (skipResponseWrapper) {
          return data;
        }
        const durationMs = Date.now() - startTime;
        const responseData = data as ResponseDto<unknown>;
        responseData.processID = processID;
        responseData.duration = `${durationMs} ms`;
        return responseData;
      }),
      catchError((error) => {
        this.logger.error({ error });
        const durationMs = Date.now() - startTime;

        // 1. BusinessException — extract errorCode + message directly
        if (error instanceof BusinessException) {
          const response = error.getResponse() as BusinessExceptionResponse;
          throw new HttpException(
            new ResponseDto({
              data: null,
              errorCode: response.errorCode,
              message: response.message,
              statusCode: response.statusCode,
              ...(response.details !== undefined ? { details: response.details } : {}),
              duration: `${durationMs} ms`,
              processID,
            }),
            response.statusCode,
          );
        }

        // 2. TypeORM QueryFailedError — transform to BusinessException
        const dbError = transformDbError(error);
        if (dbError) {
          const response = dbError.getResponse() as BusinessExceptionResponse;
          throw new HttpException(
            new ResponseDto({
              data: null,
              errorCode: response.errorCode,
              message: response.message,
              statusCode: response.statusCode,
              duration: `${durationMs} ms`,
              processID,
            }),
            response.statusCode,
          );
        }

        // 3. RpcException from TCP microservice
        // TcpLoggingInterceptor throws RpcException({ code, message, errorCode })
        // NestJS TCP client deserializes it as either:
        //   - plain object { code, message, errorCode } (direct)
        //   - or wrapped { error: { code, message, errorCode } }
        const rpcPayload = (error?.error && typeof error.error === 'object' ? error.error : error) as
          | Record<string, unknown>
          | undefined;
        if (
          rpcPayload &&
          typeof rpcPayload === 'object' &&
          !(rpcPayload instanceof Error) &&
          typeof rpcPayload['code'] === 'number'
        ) {
          const statusCode = rpcPayload['code'] as number;
          const rpcMessage = (rpcPayload['message'] as string) || HTTP_MESSAGE.INTERNAL_SERVER_ERROR;
          const errorCode = rpcPayload['errorCode'] as string | undefined;
          const details = rpcPayload['details'];

          throw new HttpException(
            new ResponseDto({
              data: null,
              errorCode,
              message: rpcMessage,
              statusCode,
              ...(details !== undefined ? { details } : {}),
              duration: `${durationMs} ms`,
              processID,
            }),
            statusCode,
          );
        }

        // 4. Standard NestJS HttpException (NotFoundException, BadRequestException, etc.)
        if (error instanceof HttpException) {
          const statusCode = error.getStatus();
          const response = error.getResponse();
          const message =
            typeof response === 'string'
              ? response
              : ((response as Record<string, unknown>)?.['message'] ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);

          throw new HttpException(
            new ResponseDto({
              data: null,
              message: Array.isArray(message) ? message.join(', ') : String(message),
              statusCode,
              duration: `${durationMs} ms`,
              processID,
            }),
            statusCode,
          );
        }

        // 5. Unknown error — fallback
        const message = getErrorMessage(ErrorCode.COMMON_INTERNAL_ERROR);
        throw new HttpException(
          new ResponseDto({
            data: null,
            errorCode: ErrorCode.COMMON_INTERNAL_ERROR,
            message,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            duration: `${durationMs} ms`,
            processID,
          }),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }),
    );
  }
}
