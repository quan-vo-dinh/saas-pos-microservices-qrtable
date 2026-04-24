const STORAGE_KEY = 'qrtable-pwa-order-idempotency';

/** Persists last idempotency key for demo; Step 2.5 will align with BFF contract. */
export function persistIdempotencyKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore quota / private mode */
  }
}

export function createAndPersistIdempotencyKey(): string {
  const key =
    typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  persistIdempotencyKey(key);
  return key;
}
