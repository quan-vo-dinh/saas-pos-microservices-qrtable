'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../api';
import type { CreateStaffPayload, StaffListQuery, StaffRoleName } from '../types';

export const staffKeys = {
  all: ['staff'] as const,
  list: (query: StaffListQuery) => [...staffKeys.all, 'list', query] as const,
};

export function useStaffListQuery(query: StaffListQuery) {
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => staffApi.list(query),
  });
}

export function useCreateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useChangeStaffRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: StaffRoleName }) =>
      staffApi.changeRole(userId, roleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useSetStaffStatusMutation(enabled: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      enabled ? staffApi.enable(userId, reason) : staffApi.disable(userId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
