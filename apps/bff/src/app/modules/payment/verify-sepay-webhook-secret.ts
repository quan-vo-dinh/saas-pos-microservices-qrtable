import { UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time compare for SePay `X-Secret-Key` vs configured secret.
 * @throws UnauthorizedException when missing or mismatch.
 */
export function assertSepayWebhookSecret(received: string | undefined, expected: string): void {
  if (!expected) {
    throw new UnauthorizedException('Invalid webhook secret');
  }
  if (received === undefined || received === null) {
    throw new UnauthorizedException('Invalid webhook secret');
  }
  const a = Buffer.from(received, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    throw new UnauthorizedException('Invalid webhook secret');
  }
  if (!timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Invalid webhook secret');
  }
}
