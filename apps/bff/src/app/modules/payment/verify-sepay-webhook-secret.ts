import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify SePay HMAC-SHA256 webhook signature.
 *
 * SePay sends:
 *   X-SePay-Signature: sha256=<hex>
 *   X-SePay-Timestamp: <unix_seconds>
 *
 * Signing payload: `{timestamp}.{rawBody}`
 *
 * @throws UnauthorizedException when signature is invalid or any input is missing.
 */
export function assertSepayHmacSignature(
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: Buffer | string,
  secret: string,
): void {
  if (!secret) {
    throw new UnauthorizedException('Webhook secret not configured');
  }
  if (!signature || !timestamp) {
    throw new UnauthorizedException('Missing SePay signature headers');
  }

  const bodyStr = rawBody instanceof Buffer ? rawBody.toString('utf8') : rawBody;
  const signingPayload = `${timestamp}.${bodyStr}`;
  const hex = createHmac('sha256', secret).update(signingPayload, 'utf8').digest('hex');
  const expected = `sha256=${hex}`;

  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Invalid webhook signature');
  }
}
