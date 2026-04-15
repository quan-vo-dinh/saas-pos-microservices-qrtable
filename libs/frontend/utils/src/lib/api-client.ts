import type { ApiResponse } from '@einvoice/types';

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type ApiClientOptions = RequestInit & {
  baseUrl?: string;
};

/**
 * Type-safe fetch wrapper for BFF API calls.
 *
 * Automatically handles JSON parsing, error responses, and data unwrapping.
 */
export async function apiClient<T>(path: string, options?: ApiClientOptions): Promise<T> {
  const { baseUrl = '', headers, ...restOptions } = options ?? {};
  const url = `${baseUrl}${path}`;

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body);
  }

  const payload = (await response.json()) as T | ApiResponse<T>;

  // Unwrap BFF response wrapper if present
  if (payload && typeof payload === 'object' && 'data' in payload && 'statusCode' in payload) {
    return (payload as ApiResponse<T>).data;
  }

  return payload as T;
}
