import { transformDbError } from '../db-error.transformer';
import { BusinessException } from '../business.exception';
import { ErrorCode } from '../error-code.enum';
import { QueryFailedError } from 'typeorm';

function createQueryFailedError(pgCode: string): QueryFailedError {
  const error = new QueryFailedError('SELECT', [], new Error('db error') as never);
  (error as unknown as Record<string, unknown>)['driverError'] = { code: pgCode };
  return error;
}

describe('transformDbError', () => {
  it('should transform unique violation (23505) to COMMON_DB_UNIQUE_VIOLATION', () => {
    const dbError = createQueryFailedError('23505');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_UNIQUE_VIOLATION);
    expect(result!.getStatus()).toBe(409);
  });

  it('should transform FK violation (23503) to COMMON_DB_FK_VIOLATION', () => {
    const dbError = createQueryFailedError('23503');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_FK_VIOLATION);
    expect(result!.getStatus()).toBe(400);
  });

  it('should transform not-null violation (23502) to COMMON_DB_NOT_NULL_VIOLATION', () => {
    const dbError = createQueryFailedError('23502');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_NOT_NULL_VIOLATION);
    expect(result!.getStatus()).toBe(400);
  });

  it('should return null for unknown PG error code', () => {
    const dbError = createQueryFailedError('42601');
    const result = transformDbError(dbError);
    expect(result).toBeNull();
  });

  it('should return null for non-QueryFailedError', () => {
    const result = transformDbError(new Error('random error'));
    expect(result).toBeNull();
  });
});
