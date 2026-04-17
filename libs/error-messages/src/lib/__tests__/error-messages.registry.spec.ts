import { getErrorMessage } from '../error-messages.registry';
import { ErrorCode } from '../error-code.enum';

describe('getErrorMessage', () => {
  it('should return Vietnamese message by default', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_CATEGORY_NOT_FOUND);
    expect(result).toBe('Danh mục không tìm thấy');
  });

  it('should return English message when locale is en', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, 'en');
    expect(result).toBe('Category not found');
  });

  it('should interpolate params with {{key}} syntax', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, 'vi', {
      current: 'available',
      new: 'cleaning',
      allowed: 'occupied',
    });
    expect(result).toBe('Chuyển trạng thái bàn không hợp lệ: available → cleaning. Cho phép: occupied');
  });

  it('should fallback to Vietnamese if locale not found', () => {
    const result = getErrorMessage(ErrorCode.AUTH_TOKEN_INVALID, 'fr' as 'vi');
    expect(result).toBe('Token không hợp lệ hoặc đã hết hạn');
  });

  it('should return error code string if code not in map', () => {
    const result = getErrorMessage('UNKNOWN_CODE' as ErrorCode);
    expect(result).toBe('UNKNOWN_CODE');
  });
});
