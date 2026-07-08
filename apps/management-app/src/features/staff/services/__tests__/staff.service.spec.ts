const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

import { staffService } from '../staff.service';

describe('staffService', () => {
  beforeEach(() => {
    mockAuthApiClient.mockReset();
    mockAuthApiClient.mockResolvedValue({});
  });

  it('list serializes search, role, status, page, and limit', async () => {
    await staffService.list({
      search: 'nguyen',
      roleName: 'WAITER',
      status: 'ACTIVE',
      page: 2,
      limit: 50,
    });

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      '/dashboard/staff?search=nguyen&roleName=WAITER&status=ACTIVE&page=2&limit=50',
    );
  });

  it('list omits query string when filters are empty', async () => {
    await staffService.list({});
    expect(mockAuthApiClient).toHaveBeenCalledWith('/dashboard/staff');
  });

  it('create sends POST /dashboard/staff', async () => {
    const payload = {
      email: 'waiter@example.com',
      firstName: 'Waiter',
      lastName: 'One',
      roleName: 'WAITER' as const,
      password: 'Password123!',
      requirePasswordUpdate: true,
    };

    await staffService.create(payload);

    expect(mockAuthApiClient).toHaveBeenCalledWith('/dashboard/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('changeRole sends PATCH /dashboard/staff/:userId/role', async () => {
    await staffService.changeRole('staff-1', 'CHEF');

    expect(mockAuthApiClient).toHaveBeenCalledWith('/dashboard/staff/staff-1/role', {
      method: 'PATCH',
      body: JSON.stringify({ roleName: 'CHEF' }),
    });
  });

  it('disable sends POST /dashboard/staff/:userId/disable', async () => {
    await staffService.disable('staff-1', 'left restaurant');

    expect(mockAuthApiClient).toHaveBeenCalledWith('/dashboard/staff/staff-1/disable', {
      method: 'POST',
      body: JSON.stringify({ reason: 'left restaurant' }),
    });
  });

  it('enable sends POST /dashboard/staff/:userId/enable', async () => {
    await staffService.enable('staff-1', 're-enabled');

    expect(mockAuthApiClient).toHaveBeenCalledWith('/dashboard/staff/staff-1/enable', {
      method: 'POST',
      body: JSON.stringify({ reason: 're-enabled' }),
    });
  });
});
