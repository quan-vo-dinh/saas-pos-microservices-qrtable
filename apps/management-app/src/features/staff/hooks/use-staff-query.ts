'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { staffKeys } from '../staff-keys';
import { staffService } from '../services/staff.service';
import type { CreateStaffPayload, StaffListQuery, StaffRoleName } from '../types';

export function useStaffListQuery(query: StaffListQuery) {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => staffService.list(query),
    enabled: authReady,
  });
}

export function useCreateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useChangeStaffRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: StaffRoleName }) =>
      staffService.changeRole(userId, roleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useSetStaffStatusMutation(enabled: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      enabled ? staffService.enable(userId, reason) : staffService.disable(userId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
