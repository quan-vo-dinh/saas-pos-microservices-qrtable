import { getErrorMessage } from '../error-messages.registry';
import { ErrorCode } from '../error-code.enum';
import { ERROR_MESSAGES_EN } from '../error-messages.en';
import { ERROR_MESSAGES_VI } from '../error-messages.vi';

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

  it('should define Vietnamese and English messages for every error code', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_MESSAGES_VI[code]).toEqual(expect.any(String));
      expect(ERROR_MESSAGES_VI[code].length).toBeGreaterThan(0);
      expect(ERROR_MESSAGES_EN[code]).toEqual(expect.any(String));
      expect(ERROR_MESSAGES_EN[code].length).toBeGreaterThan(0);
    }
  });

  it('should expose payment and tenant lifecycle messages through the registry', () => {
    expect(getErrorMessage(ErrorCode.PAYMENT_BILL_NOT_PENDING_PAYMENT)).toBe(
      'Hóa đơn không ở trạng thái chờ thanh toán',
    );
    expect(getErrorMessage(ErrorCode.TENANT_STATUS_UNAVAILABLE, 'en')).toBe('Tenant status is temporarily unavailable');
    expect(getErrorMessage(ErrorCode.SEPAY_ACCESS_TOKEN_NOT_CONFIGURED, 'en')).toBe(
      'SePay access token is not configured',
    );
  });
});
