/** Generic API response wrapper used by the BFF gateway. */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  statusCode: number;
  processID?: string;
  duration?: string;
};

/** Error response returned by API on failures. */
export type ApiErrorResponse = {
  statusCode: number;
  message: string | string[];
  errorCode?: string;
  error?: string;
  details?: unknown;
  processID?: string;
  duration?: string;
};

/** Paginated list response. */
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Pagination query parameters. */
export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

/** Sort query parameters. */
export type SortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
