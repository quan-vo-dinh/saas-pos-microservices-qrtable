import { createHash } from 'node:crypto';

export function devQrTokenHex(tenantId: string, tableKey: string): string {
  return createHash('sha256').update(`${tenantId}:${tableKey}:qrtable-dev-qr`).digest('hex');
}
