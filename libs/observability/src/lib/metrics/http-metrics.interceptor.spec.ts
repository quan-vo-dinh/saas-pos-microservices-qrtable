import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { throwError } from 'rxjs';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { QrtableMetricsService } from './metrics.service';

describe('HttpMetricsInterceptor', () => {
  it('records the final HttpException status for business errors', () => {
    const metrics = {
      recordHttpRequest: jest.fn(),
    } as unknown as QrtableMetricsService;
    const interceptor = new HttpMetricsInterceptor(metrics, 'bff');
    const context = httpContext({
      method: 'POST',
      path: '/api/v1/menu/validate-qr',
      routePath: '/api/v1/menu/validate-qr',
      responseStatusCode: 201,
    });
    const next = {
      handle: () => throwError(() => new ForbiddenException('Invalid QR token')),
    } as CallHandler<unknown>;

    interceptor.intercept(context, next).subscribe({ error: () => undefined });

    expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
      {
        service: 'bff',
        method: 'POST',
        route: '/api/v1/menu/validate-qr',
        status: '403',
      },
      expect.any(Number),
    );
  });

  it('records TCP business error payload status before exception wrapping', () => {
    const metrics = {
      recordHttpRequest: jest.fn(),
    } as unknown as QrtableMetricsService;
    const interceptor = new HttpMetricsInterceptor(metrics, 'bff');
    const context = httpContext({
      method: 'POST',
      path: '/api/v1/menu/validate-qr',
      routePath: '/api/v1/menu/validate-qr',
      responseStatusCode: 201,
    });
    const next = {
      handle: () =>
        throwError(() => ({
          error: {
            code: 403,
            message: 'Invalid QR token',
            errorCode: 'CATALOG_TABLE_INVALID_QR_TOKEN',
          },
        })),
    } as CallHandler<unknown>;

    interceptor.intercept(context, next).subscribe({ error: () => undefined });

    expect(metrics.recordHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        route: '/api/v1/menu/validate-qr',
        status: '403',
      }),
      expect.any(Number),
    );
  });
});

function httpContext(input: {
  method: string;
  path: string;
  routePath: string;
  responseStatusCode: number;
}): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        method: input.method,
        path: input.path,
        route: { path: input.routePath },
      }),
      getResponse: () => ({
        statusCode: input.responseStatusCode,
      }),
    }),
  } as unknown as ExecutionContext;
}
