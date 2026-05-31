import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { staffRoleVi, staffStatusVi } from '@einvoice/shared-constants';
import type { UserProfile } from '@einvoice/types';
import type { StaffListResponse, StaffProfile } from '../types';

const mockUseAuthStore = jest.fn();
const mockUseStaffListQuery = jest.fn();
const mockUseCreateStaffMutation = jest.fn();
const mockUseChangeStaffRoleMutation = jest.fn();
const mockUseSetStaffStatusMutation = jest.fn();

jest.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (selector: (state: { profile: UserProfile | null }) => unknown) =>
    mockUseAuthStore(selector),
}));

jest.mock('../hooks/use-staff-query', () => ({
  useStaffListQuery: (...args: unknown[]) => mockUseStaffListQuery(...args),
  useCreateStaffMutation: () => mockUseCreateStaffMutation(),
  useChangeStaffRoleMutation: () => mockUseChangeStaffRoleMutation(),
  useSetStaffStatusMutation: (enabled: boolean) => mockUseSetStaffStatusMutation(enabled),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { StaffPageClient } from '../staff-page-client';

const sampleStaff: StaffProfile = {
  userId: 'staff-1',
  tenantId: 'tenant-1',
  email: 'waiter@example.com',
  firstName: 'Nguyen',
  lastName: 'Van A',
  displayName: 'Nguyen Van A',
  roleName: 'WAITER',
  isActive: true,
  disabledAt: null,
  createdAt: '2026-01-15T08:00:00.000Z',
  updatedAt: '2026-01-15T08:00:00.000Z',
};

const listResponse: StaffListResponse = {
  items: [sampleStaff],
  page: 1,
  limit: 20,
  total: 1,
};

function renderStaffPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StaffPageClient />
    </QueryClientProvider>,
  );
}

function mockAuthProfile(roles: string[]) {
  const profile: UserProfile = {
    userId: 'actor-1',
    tenantId: 'tenant-1',
    roles,
    permissions: [],
  };
  mockUseAuthStore.mockImplementation((selector) => selector({ profile }));
}

describe('StaffPageClient policy', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateStaffMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockUseChangeStaffRoleMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockUseSetStaffStatusMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    mockUseStaffListQuery.mockReturnValue({
      data: listResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders staff rows with mapped role and status labels', () => {
    mockAuthProfile(['OWNER']);

    renderStaffPage();

    expect(screen.getByText('Nguyen Van A')).not.toBeNull();
    expect(screen.getByText('waiter@example.com')).not.toBeNull();
    expect(screen.getByText(staffRoleVi('WAITER'))).not.toBeNull();
    expect(screen.getByText(staffStatusVi('ACTIVE'))).not.toBeNull();
    expect(screen.queryByText('WAITER')).toBeNull();
    expect(screen.queryByText('ACTIVE')).toBeNull();
  });

  it('shows role and status actions for owner', () => {
    mockAuthProfile(['OWNER']);

    renderStaffPage();

    expect(screen.getByRole('button', { name: 'Đổi vai trò' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Vô hiệu hóa' })).not.toBeNull();
  });

  it('hides role and status actions for manager', () => {
    mockAuthProfile(['MANAGER']);

    renderStaffPage();

    expect(screen.queryByRole('button', { name: 'Đổi vai trò' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vô hiệu hóa' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Thêm nhân viên' })).not.toBeNull();
  });

  it('manager create dialog excludes manager role', () => {
    mockAuthProfile(['MANAGER']);

    renderStaffPage();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }));

    const dialog = screen.getByRole('dialog');
    const roleTrigger = within(dialog).getByLabelText('Vai trò');
    fireEvent.click(roleTrigger);

    expect(screen.getByRole('option', { name: staffRoleVi('WAITER') })).not.toBeNull();
    expect(screen.getByRole('option', { name: staffRoleVi('CHEF') })).not.toBeNull();
    expect(screen.getByRole('option', { name: staffRoleVi('BARISTA') })).not.toBeNull();
    expect(screen.queryByRole('option', { name: staffRoleVi('MANAGER') })).toBeNull();
  });
});
