import { apiClient, ApiError } from '../api-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response-like object that satisfies what apiClient reads. */
function mockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const { ok = true, status = 200 } = init;
  const textValue = typeof body === 'string' ? body : JSON.stringify(body);
  const jsonValue = typeof body === 'string' ? undefined : body;

  return {
    ok,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: jest.fn().mockResolvedValue(textValue),
    json: jest.fn().mockResolvedValue(jsonValue),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('apiClient', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse({}));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. URL construction
  // -----------------------------------------------------------------------
  it('combines baseUrl + path into the correct URL', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ value: 1 }));

    await apiClient('/api/items', { baseUrl: 'https://example.com' });

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/api/items', expect.any(Object));
  });

  it('uses path only when baseUrl is omitted', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ value: 1 }));

    await apiClient('/api/items');

    expect(fetchSpy).toHaveBeenCalledWith('/api/items', expect.any(Object));
  });

  // -----------------------------------------------------------------------
  // 2. Default Content-Type header
  // -----------------------------------------------------------------------
  it('sets Content-Type: application/json by default', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ ok: true }));

    await apiClient('/test');

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
  });

  // -----------------------------------------------------------------------
  // 3. Custom header merging
  // -----------------------------------------------------------------------
  it('merges custom headers (Authorization, x-tenant-id) with defaults', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ ok: true }));

    await apiClient('/secure', {
      headers: {
        Authorization: 'Bearer tok-123',
        'x-tenant-id': 'tenant-abc',
      },
    });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok-123',
        'x-tenant-id': 'tenant-abc',
      }),
    );
  });

  it('preserves Content-Type when custom headers omit it', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ ok: true }));

    await apiClient('/secure', {
      headers: {
        Authorization: 'Bearer tok-123',
      },
    });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-123',
    });
  });

  // -----------------------------------------------------------------------
  // 4. BFF response wrapper unwrapping
  // -----------------------------------------------------------------------
  it('unwraps BFF response wrapper { data, statusCode, message } → returns data', async () => {
    const innerData = { id: '42', name: 'Pizza' };
    const bffPayload = {
      data: innerData,
      statusCode: 200,
      message: 'OK',
    };
    fetchSpy.mockResolvedValue(mockResponse(bffPayload));

    const result = await apiClient<{ id: string; name: string }>('/menu');

    expect(result).toEqual(innerData);
  });

  // -----------------------------------------------------------------------
  // 5. Raw payload passthrough
  // -----------------------------------------------------------------------
  it('returns raw payload when response is not BFF wrapper format', async () => {
    const raw = { items: [1, 2, 3] };
    fetchSpy.mockResolvedValue(mockResponse(raw));

    const result = await apiClient<{ items: number[] }>('/plain');

    expect(result).toEqual(raw);
  });

  it('returns raw payload for primitive array responses', async () => {
    const raw = [1, 2, 3];
    fetchSpy.mockResolvedValue(mockResponse(raw));

    const result = await apiClient<number[]>('/numbers');

    expect(result).toEqual([1, 2, 3]);
  });

  // -----------------------------------------------------------------------
  // 6. ApiError on non-ok responses
  // -----------------------------------------------------------------------
  it('throws ApiError with correct status and body on non-ok response', async () => {
    fetchSpy.mockResolvedValue(mockResponse('Not Found', { ok: false, status: 404 }));

    await expect(apiClient('/missing')).rejects.toThrow(ApiError);

    try {
      await apiClient('/missing');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.body).toBe('Not Found');
      expect(apiErr.message).toBe('Not Found');
      expect(apiErr.name).toBe('ApiError');
    }
  });

  it('throws ApiError on 500 server errors', async () => {
    fetchSpy.mockResolvedValue(mockResponse('Internal Server Error', { ok: false, status: 500 }));

    await expect(apiClient('/fail')).rejects.toThrow(ApiError);
    await expect(apiClient('/fail')).rejects.toThrow('Internal Server Error');
  });

  it('uses typed server message and error code from BFF error responses', async () => {
    expect.assertions(4);
    fetchSpy.mockResolvedValue(
      mockResponse(
        { statusCode: 409, message: 'Hóa đơn đã được thanh toán', errorCode: 'PAYMENT_BILL_ALREADY_PAID' },
        {
          ok: false,
          status: 409,
        },
      ),
    );

    try {
      await apiClient('/payment');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Hóa đơn đã được thanh toán');
      expect(apiErr.serverMessage).toBe('Hóa đơn đã được thanh toán');
      expect(apiErr.errorCode).toBe('PAYMENT_BILL_ALREADY_PAID');
    }
  });

  it('normalizes validation message arrays and ignores non-string error codes', async () => {
    expect.assertions(3);
    fetchSpy.mockResolvedValue(
      mockResponse(
        { statusCode: 400, message: ['Name is required', { nested: true }, 'Price is invalid'], errorCode: 42 },
        {
          ok: false,
          status: 400,
        },
      ),
    );

    try {
      await apiClient('/invalid');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.serverMessage).toBe('Name is required; Price is invalid');
      expect(apiErr.errorCode).toBeUndefined();
    }
  });

  // -----------------------------------------------------------------------
  // 7. HTTP method and body forwarding
  // -----------------------------------------------------------------------
  it('forwards HTTP method and JSON body correctly for POST', async () => {
    const requestBody = { name: 'New Item', price: 9.99 };
    fetchSpy.mockResolvedValue(mockResponse({ id: '1', ...requestBody }));

    await apiClient('/items', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe('POST');
    expect(calledOptions.body).toBe(JSON.stringify(requestBody));
  });

  it('forwards HTTP method correctly for PUT', async () => {
    const requestBody = { name: 'Updated Item' };
    fetchSpy.mockResolvedValue(mockResponse({ id: '1', ...requestBody }));

    await apiClient('/items/1', {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe('PUT');
    expect(calledOptions.body).toBe(JSON.stringify(requestBody));
  });

  it('forwards HTTP method correctly for DELETE (no body)', async () => {
    fetchSpy.mockResolvedValue(mockResponse({}));

    await apiClient('/items/1', { method: 'DELETE' });

    const calledOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(calledOptions.method).toBe('DELETE');
    expect(calledOptions.body).toBeUndefined();
  });
});
