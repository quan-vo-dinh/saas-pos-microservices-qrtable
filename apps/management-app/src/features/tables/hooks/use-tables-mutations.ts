'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { successMessage, getErrorDisplayMessage } from '@einvoice/frontend-utils';
import { tablesService } from '../services/tables.service';
import { tableKeys } from '../table-keys';

// ─── Area Mutations ─────────────────────────────────

export function useCreateAreaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) => tablesService.createArea(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.areas() });
      toast.success(successMessage('created', 'area'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUpdateAreaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; sortOrder?: number } }) =>
      tablesService.updateArea(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.areas() });
      toast.success(successMessage('updated', 'area'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useDeleteAreaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.deleteArea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('deleted', 'area'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useReorderAreasMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) => tablesService.reorderAreas(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.areas() });
      toast.success(successMessage('reordered', 'area'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

// ─── Table Mutations ────────────────────────────────

export function useCreateTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; areaId: string; capacity: number }) => tablesService.createTable(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('created', 'table'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUpdateTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; areaId: string; capacity: number } }) =>
      tablesService.updateTable(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('updated', 'table'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useDeleteTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.deleteTable(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('deleted', 'table'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUpdateTableStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tablesService.updateTableStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('statusUpdated'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useRegenerateQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.regenerateQr(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success(successMessage('qrRegenerated'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}
