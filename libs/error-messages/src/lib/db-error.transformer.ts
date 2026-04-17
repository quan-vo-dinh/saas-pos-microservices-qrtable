import { HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from './error-code.enum';
import { BusinessException } from './business.exception';

interface DriverError {
  code?: string;
  detail?: string;
  constraint?: string;
}

const PG_ERROR_MAP: Record<string, { errorCode: ErrorCode; statusCode: HttpStatus }> = {
  '23505': { errorCode: ErrorCode.COMMON_DB_UNIQUE_VIOLATION, statusCode: HttpStatus.CONFLICT },
  '23503': { errorCode: ErrorCode.COMMON_DB_FK_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
  '23502': { errorCode: ErrorCode.COMMON_DB_NOT_NULL_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
};

export function transformDbError(error: unknown): BusinessException | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }

  const driverError = (error as QueryFailedError & { driverError?: DriverError }).driverError;
  const pgCode = driverError?.code;

  if (pgCode && PG_ERROR_MAP[pgCode]) {
    const { errorCode, statusCode } = PG_ERROR_MAP[pgCode];
    return new BusinessException(errorCode, statusCode);
  }

  return null;
}
