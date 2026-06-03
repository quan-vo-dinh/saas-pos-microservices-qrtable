import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

type TcpBusinessErrorPayload = {
  code?: number;
  statusCode?: number;
  errorCode?: string;
  message?: string;
  details?: unknown;
};

const ERROR_CODE_VALUES = new Set<string>(Object.values(ErrorCode));

export function toBusinessExceptionFromTcpError(
  error: unknown,
  fallbackStatus = HttpStatus.BAD_GATEWAY,
): BusinessException | null {
  if (error instanceof BusinessException) {
    return error;
  }

  const payload =
    error instanceof RpcException
      ? extractTcpBusinessErrorPayload(error.getError())
      : extractTcpBusinessErrorPayload(error);
  if (!payload?.errorCode || !isErrorCode(payload.errorCode)) {
    return null;
  }

  const statusCode = ((payload.code ?? payload.statusCode) || fallbackStatus) as HttpStatus;
  const details = payload.details ?? (payload.message ? { message: payload.message } : undefined);
  return new BusinessException(payload.errorCode, statusCode, undefined, undefined, details);
}

function extractTcpBusinessErrorPayload(value: unknown): TcpBusinessErrorPayload | null {
  const direct = asRecord(value);
  if (!direct) {
    return null;
  }

  const source = asRecord(direct['error']) ?? direct;
  const code = typeof source['code'] === 'number' ? source['code'] : undefined;
  const statusCode = typeof source['statusCode'] === 'number' ? source['statusCode'] : undefined;
  const errorCode = typeof source['errorCode'] === 'string' ? source['errorCode'] : undefined;
  const message = typeof source['message'] === 'string' ? source['message'] : undefined;
  const details = source['details'];

  if (
    code === undefined &&
    statusCode === undefined &&
    errorCode === undefined &&
    message === undefined &&
    details === undefined
  ) {
    return null;
  }

  return {
    code,
    statusCode,
    errorCode,
    message,
    ...(details !== undefined ? { details } : {}),
  };
}

function isErrorCode(value: string): value is ErrorCode {
  return ERROR_CODE_VALUES.has(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}
