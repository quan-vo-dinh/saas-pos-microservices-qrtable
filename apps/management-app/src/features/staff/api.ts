'use client';

import { authApiClient, type AuthClientOptions } from '@/lib/api/authenticated-client';
import type { CreateStaffPayload, StaffListQuery, StaffListResponse, StaffProfile, StaffRoleName } from './types';

function toSearchParams(query: StaffListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.roleName) params.set('roleName', query.roleName);
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const value = params.toString();
  return value ? `?${value}` : '';
}

function post(body: unknown): AuthClientOptions {
  return { method: 'POST', body: JSON.stringify(body) };
}

function patch(body: unknown): AuthClientOptions {
  return { method: 'PATCH', body: JSON.stringify(body) };
}

export const staffApi = {
  list: (query: StaffListQuery) => authApiClient<StaffListResponse>(`/dashboard/staff${toSearchParams(query)}`),
  get: (userId: string) => authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}`),
  create: (payload: CreateStaffPayload) => authApiClient<StaffProfile>('/dashboard/staff', post(payload)),
  changeRole: (userId: string, roleName: StaffRoleName) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/role`, patch({ roleName })),
  disable: (userId: string, reason: string) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/disable`, post({ reason })),
  enable: (userId: string, reason: string) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/enable`, post({ reason })),
};
