import { CallHandler, ExecutionContext, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom, of, throwError } from 'rxjs';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { TcpLoggingInterceptor } from './tcpLogging.interceptor';

function handleWebhook(): void {
  return undefined;
}

describe('TcpLoggingInterceptor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts secret-like fields before logging TCP params', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation();
    const context = {
      getHandler: () => handleWebhook,
      getArgs: () => [
        {
          processId: 'process-1',
          data: {
            secret: 'raw-secret',
            webhookSecret: 'nested-secret',
            payload: { code: 'QRSUB123' },
          },
        },
      ],
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    await lastValueFrom(new TcpLoggingInterceptor().intercept(context, next));

    const logOutput = JSON.stringify(logSpy.mock.calls);
    expect(logOutput).not.toContain('raw-secret');
    expect(logOutput).not.toContain('nested-secret');
    expect(logOutput).toContain('[REDACTED]');
    expect(logOutput).toContain('QRSUB123');
  });

  it('propagates BusinessException details through RpcException payload', async () => {
    jest.spyOn(Logger, 'log').mockImplementation();
    jest.spyOn(Logger, 'error').mockImplementation();

    const context = {
      getHandler: () => handleWebhook,
      getArgs: () => [{ processId: 'process-1' }],
    } as unknown as ExecutionContext;
    const details = { quota: 'tables', limit: 10, current: 11 };
    const next = {
      handle: () =>
        throwError(
          () =>
            new BusinessException(
              ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
              HttpStatus.FORBIDDEN,
              undefined,
              undefined,
              details,
            ),
        ),
    } as CallHandler;

    try {
      await lastValueFrom(new TcpLoggingInterceptor().intercept(context, next));
      fail('Expected RpcException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RpcException);
      expect((error as RpcException).getError()).toMatchObject({
        code: HttpStatus.FORBIDDEN,
        errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
        details,
      });
    }
  });
});
