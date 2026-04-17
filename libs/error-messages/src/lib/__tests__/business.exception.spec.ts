import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../business.exception';
import { ErrorCode } from '../error-code.enum';

describe('BusinessException', () => {
  it('should create exception with errorCode and Vietnamese message', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT);

    expect(exception.errorCode).toBe('CATALOG_CATEGORY_DUPLICATE_NAME');
    expect(exception.getStatus()).toBe(409);

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response['errorCode']).toBe('CATALOG_CATEGORY_DUPLICATE_NAME');
    expect(response['message']).toBe('Tên danh mục đã tồn tại');
    expect(response['statusCode']).toBe(409);
  });

  it('should interpolate params in message', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, HttpStatus.BAD_REQUEST, {
      current: 'available',
      new: 'cleaning',
      allowed: 'occupied',
    });

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response['message']).toBe('Chuyển trạng thái bàn không hợp lệ: available → cleaning. Cho phép: occupied');
  });

  it('should support English locale', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_AREA_NOT_FOUND, HttpStatus.NOT_FOUND, undefined, 'en');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response['message']).toBe('Area not found');
  });
});
