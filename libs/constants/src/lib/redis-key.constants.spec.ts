import { RedisKey } from './redis-key.constants';

describe('RedisKey', () => {
  it('builds stable menu, session, cart, and quota keys', () => {
    expect(RedisKey.menu.public('tenant-1')).toBe('menu:tenant-1');
    expect(RedisKey.session.data('tenant-1', 'session-1')).toBe('session:tenant-1:session-1');
    expect(RedisKey.cart.data('tenant-1', 'session-1')).toBe('cart:tenant-1:session-1');
    expect(RedisKey.quota.dailyOrders('tenant-1', '2026-05-22')).toBe('quota:tenant-1:orders:2026-05-22');
  });
});
