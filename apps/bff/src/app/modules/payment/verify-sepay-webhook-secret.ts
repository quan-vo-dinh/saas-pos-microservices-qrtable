import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus } from '@nestjs/common';
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
 * @throws BusinessException when signature is invalid or any input is missing.
 */
export function assertSepayHmacSignature(
  signature: string | undefined,
  timestamp: string | undefined,
  rawBody: Buffer | string,
  secret: string,
): void {
  if (!secret) {
    throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SECRET_NOT_CONFIGURED, HttpStatus.UNAUTHORIZED);
  }
  if (!signature || !timestamp) {
    throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SIGNATURE_MISSING, HttpStatus.UNAUTHORIZED);
  }

  const bodyStr = rawBody instanceof Buffer ? rawBody.toString('utf8') : rawBody;
  const signingPayload = `${timestamp}.${bodyStr}`;
  const hex = createHmac('sha256', secret).update(signingPayload, 'utf8').digest('hex');
  const expected = `sha256=${hex}`;

  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SIGNATURE_INVALID, HttpStatus.UNAUTHORIZED);
  }
}
