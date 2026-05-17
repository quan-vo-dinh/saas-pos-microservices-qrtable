import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { getErrorMessage } from './error-messages.registry';
import type { SupportedLocale } from './success-messages';

export interface BusinessExceptionResponse {
  errorCode: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class BusinessException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(
    errorCode: ErrorCode,
    statusCode: HttpStatus,
    params?: Record<string, string>,
    locale?: SupportedLocale,
    details?: unknown,
  ) {
    const message = getErrorMessage(errorCode, locale, params);
    const response: BusinessExceptionResponse = {
      errorCode,
      message,
      statusCode,
    };
    if (details !== undefined) {
      response.details = details;
    }
    super(response, statusCode);
    this.errorCode = errorCode;
  }
}
