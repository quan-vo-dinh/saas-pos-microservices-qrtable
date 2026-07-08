import type { ServiceRequestListParams } from './services/service-request.service';

export const serviceRequestKeys = {
  all: ['admin-service-requests'] as const,
  lists: () => [...serviceRequestKeys.all, 'list'] as const,
  list: (params?: ServiceRequestListParams) => [...serviceRequestKeys.lists(), params ?? {}] as const,
};
