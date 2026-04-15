'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tablesService } from '../services/tables.service';
import { tableKeys } from './use-tables-query';

// ─── Area Mutations ─────────────────────────────────

export function useCreateAreaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) => tablesService.createArea(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.areas() });
      toast.success('Area created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create area: ${error.message}`);
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
      toast.success('Area updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update area: ${error.message}`);
    },
  });
}

export function useDeleteAreaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.deleteArea(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success('Area deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete area: ${error.message}`);
    },
  });
}

export function useReorderAreasMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) => tablesService.reorderAreas(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.areas() });
      toast.success('Areas reordered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder areas: ${error.message}`);
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
      toast.success('Table created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create table: ${error.message}`);
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
      toast.success('Table updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update table: ${error.message}`);
    },
  });
}

export function useDeleteTableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.deleteTable(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success('Table deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete table: ${error.message}`);
    },
  });
}

export function useUpdateTableStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tablesService.updateTableStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success('Table status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update table status: ${error.message}`);
    },
  });
}

export function useRegenerateQrMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tablesService.regenerateQr(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success('QR code regenerated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to regenerate QR code: ${error.message}`);
    },
  });
}
