import { ApiError } from '../api-client';
import { getErrorDisplayMessage, successMessage } from '../messages';

describe('successMessage', () => {
  it.each([
    ['order', 'Đơn hàng đã được cập nhật thành công'],
    ['bill', 'Hóa đơn đã được cập nhật thành công'],
    ['table', 'Bàn đã được cập nhật thành công'],
    ['serviceRequest', 'Yêu cầu phục vụ đã được cập nhật thành công'],
  ] as const)('resolves the current call-site entity key "%s"', (entityKey, expectedMessage) => {
    expect(successMessage('updated', entityKey)).toBe(expectedMessage);
  });

  it('does not leak the entity placeholder when an entity template is called without an entity key', () => {
    expect(successMessage('created')).toBe('Đối tượng đã được tạo thành công');
  });

  it('does not leak the entity placeholder when an unknown entity key reaches runtime', () => {
    expect(successMessage('deleted', 'unknownEntity' as never)).toBe('Đối tượng đã được xóa');
  });

  it('returns static templates unchanged', () => {
    expect(successMessage('statusUpdated')).toBe('Trạng thái đã được cập nhật');
  });
});

describe('getErrorDisplayMessage', () => {
  it('prefers ApiError.serverMessage over the raw error body', () => {
    const error = new ApiError(400, JSON.stringify({ message: 'Tên bàn đã tồn tại', errorCode: 'TABLE_NAME_EXISTS' }));

    expect(getErrorDisplayMessage(error)).toBe('Tên bàn đã tồn tại');
  });

  it('falls back to the native Error message', () => {
    expect(getErrorDisplayMessage(new Error('Network failed'))).toBe('Network failed');
  });
});
