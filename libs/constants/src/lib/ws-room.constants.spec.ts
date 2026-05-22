import { WsRoom } from './ws-room.constants';

describe('WsRoom', () => {
  it('builds stable staff, management, and customer rooms', () => {
    expect(WsRoom.staff('tenant-1')).toBe('tenant:tenant-1:staff');
    expect(WsRoom.management('tenant-1')).toBe('tenant:tenant-1:management');
    expect(WsRoom.customers('tenant-1')).toBe('tenant:tenant-1:customers');
    expect(WsRoom.tenantSlugCustomers('tenant-slug')).toBe('tenant-slug:tenant-slug:customers');
    expect(WsRoom.customer('session-1')).toBe('session:session-1:customer');
  });

  it('normalizes KDS station room slugs', () => {
    expect(WsRoom.kds('tenant-1', 'KITCHEN')).toBe('tenant:tenant-1:kds:kitchen');
    expect(WsRoom.kds('tenant-1', 'BAR')).toBe('tenant:tenant-1:kds:bar');
  });
});
