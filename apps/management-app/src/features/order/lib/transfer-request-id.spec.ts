import { createTransferRequestId } from './transfer-request-id';

describe('createTransferRequestId', () => {
  it('creates a UUID-shaped transfer idempotency key', () => {
    const id = createTransferRequestId();

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
