/**
 * Unit tests for uploadFile()
 *
 * Runs in testEnvironment: 'node', so we fully mock XMLHttpRequest
 * and use the native Node 18+ FormData / File globals.
 */
import { uploadFile, UploadOptions } from '../upload-client';

// ---------------------------------------------------------------------------
// Mock XMLHttpRequest
// ---------------------------------------------------------------------------

type EventHandler = (event: any) => void;

class MockXHR {
  // Spies exposed for assertions
  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();

  status = 200;
  responseText = '';

  // Separate listener maps for xhr and xhr.upload
  private _listeners: Record<string, EventHandler[]> = {};
  private _uploadListeners: Record<string, EventHandler[]> = {};

  upload = {
    addEventListener: jest.fn((event: string, handler: EventHandler) => {
      (this._uploadListeners[event] ??= []).push(handler);
    }),
  };

  addEventListener = jest.fn((event: string, handler: EventHandler) => {
    (this._listeners[event] ??= []).push(handler);
  });

  // ---- helpers to trigger events from tests ----

  /** Fire an event on the XHR itself (load, error, abort) */
  _emit(event: string, payload: any = {}) {
    for (const fn of this._listeners[event] ?? []) fn(payload);
  }

  /** Fire an event on xhr.upload (progress) */
  _emitUpload(event: string, payload: any = {}) {
    for (const fn of this._uploadListeners[event] ?? []) fn(payload);
  }
}

// Keep a reference to the latest instance so each test can drive it.
let latestXhr: MockXHR;

beforeEach(() => {
  latestXhr = undefined as unknown as MockXHR;
  (globalThis as any).XMLHttpRequest = jest.fn(() => {
    latestXhr = new MockXHR();
    return latestXhr;
  });
});

afterEach(() => {
  delete (globalThis as any).XMLHttpRequest;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal File-like blob that FormData accepts in Node 18+ */
function makeFile(name = 'photo.png'): File {
  return new File(['binary-content'], name, { type: 'image/png' });
}

function defaultOpts(overrides: Partial<UploadOptions> = {}): UploadOptions {
  return {
    url: 'https://api.example.com/upload',
    file: makeFile(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('uploadFile', () => {
  // -----------------------------------------------------------------------
  // 1. CRITICAL — FormData field name is 'image'
  // -----------------------------------------------------------------------
  it("appends the file under the field name 'image' (NOT 'file')", () => {
    const file = makeFile('burger.jpg');
    uploadFile(defaultOpts({ file }));

    // `send` is called with the FormData instance
    const sentFormData: FormData = latestXhr.send.mock.calls[0][0];
    expect(sentFormData).toBeInstanceOf(FormData);
    expect(sentFormData.get('image')).not.toBeNull();
    expect(sentFormData.get('image')).toBe(file);
    // Ensure the old buggy field name is NOT present
    expect(sentFormData.get('file')).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 2. Opens POST request to the correct URL
  // -----------------------------------------------------------------------
  it('opens a POST request to the provided URL', () => {
    const url = 'https://cdn.qrtable.io/v1/images';
    uploadFile(defaultOpts({ url }));

    expect(latestXhr.open).toHaveBeenCalledWith('POST', url);
  });

  // -----------------------------------------------------------------------
  // 3. Sets custom headers
  // -----------------------------------------------------------------------
  it('sets custom headers (Authorization, x-tenant-id)', () => {
    const headers = {
      Authorization: 'Bearer tok-123',
      'x-tenant-id': 'tenant-abc',
    };
    uploadFile(defaultOpts({ headers }));

    expect(latestXhr.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok-123');
    expect(latestXhr.setRequestHeader).toHaveBeenCalledWith('x-tenant-id', 'tenant-abc');
    expect(latestXhr.setRequestHeader).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // 4. Registers progress listener and reports percentage
  // -----------------------------------------------------------------------
  it('calls onProgress with the upload percentage', () => {
    const onProgress = jest.fn();
    uploadFile(defaultOpts({ onProgress }));

    // Simulate a progress event: 50 of 200 bytes ⇒ 25 %
    latestXhr._emitUpload('progress', { lengthComputable: true, loaded: 50, total: 200 });
    expect(onProgress).toHaveBeenCalledWith(25);

    // 200 of 200 ⇒ 100 %
    latestXhr._emitUpload('progress', { lengthComputable: true, loaded: 200, total: 200 });
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('does not call onProgress when lengthComputable is false', () => {
    const onProgress = jest.fn();
    uploadFile(defaultOpts({ onProgress }));

    latestXhr._emitUpload('progress', { lengthComputable: false, loaded: 0, total: 0 });
    expect(onProgress).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 5. Resolves with parsed BFF response – unwraps { data: ... }
  // -----------------------------------------------------------------------
  it('resolves and unwraps BFF response with { data: { imageUrl } }', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr.status = 200;
    latestXhr.responseText = JSON.stringify({ data: { imageUrl: 'https://cdn.example.com/img.png' } });
    latestXhr._emit('load');

    await expect(promise).resolves.toEqual({ imageUrl: 'https://cdn.example.com/img.png' });
  });

  it('resolves with flat response when data wrapper is absent', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr.status = 201;
    latestXhr.responseText = JSON.stringify({ imageUrl: 'https://cdn.example.com/flat.png' });
    latestXhr._emit('load');

    await expect(promise).resolves.toEqual({ imageUrl: 'https://cdn.example.com/flat.png' });
  });

  it('rejects when response JSON is unparseable', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr.status = 200;
    latestXhr.responseText = 'NOT-JSON';
    latestXhr._emit('load');

    await expect(promise).rejects.toThrow('Upload response parse error: NOT-JSON');
  });

  // -----------------------------------------------------------------------
  // 6. Rejects on non-2xx status
  // -----------------------------------------------------------------------
  it('rejects on HTTP 400', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr.status = 400;
    latestXhr.responseText = 'Bad Request';
    latestXhr._emit('load');

    await expect(promise).rejects.toThrow('Upload failed with status 400: Bad Request');
  });

  it('rejects on HTTP 500', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr.status = 500;
    latestXhr.responseText = 'Internal Server Error';
    latestXhr._emit('load');

    await expect(promise).rejects.toThrow('Upload failed with status 500: Internal Server Error');
  });

  // -----------------------------------------------------------------------
  // 7. Rejects on network error
  // -----------------------------------------------------------------------
  it('rejects with "Upload network error" on XHR error event', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr._emit('error');

    await expect(promise).rejects.toThrow('Upload network error');
  });

  it('rejects with "Upload aborted" on XHR abort event', async () => {
    const promise = uploadFile(defaultOpts());

    latestXhr._emit('abort');

    await expect(promise).rejects.toThrow('Upload aborted');
  });
});
