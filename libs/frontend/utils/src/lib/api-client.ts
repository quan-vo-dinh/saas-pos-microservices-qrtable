import type { ApiErrorResponse, ApiResponse } from '@einvoice/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeServerMessage(value: unknown): string | undefined {
  const message = normalizeString(value);
  if (message) {
    return message;
  }

  if (Array.isArray(value)) {
    const messages = value.map(normalizeString).filter((item): item is string => Boolean(item));
    return messages.length > 0 ? messages.join('; ') : undefined;
  }

  return undefined;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | undefined;
  readonly serverMessage: string;
  readonly body: string;

  constructor(status: number, body: string) {
    let errorCode: string | undefined;
    let serverMessage = body;

    try {
      const parsed: unknown = JSON.parse(body);
      if (isRecord(parsed)) {
        const response = parsed as ApiErrorResponse;
        errorCode = normalizeString(response.errorCode);
        serverMessage = normalizeServerMessage(response.message) ?? body;
      }
    } catch {
      // body is not JSON — use raw text
    }

    super(serverMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.serverMessage = serverMessage;
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
