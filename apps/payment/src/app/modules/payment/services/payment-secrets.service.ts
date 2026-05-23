import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export const PAYMENT_SECRETS_ENCRYPTION_KEY = Symbol('PAYMENT_SECRETS_ENCRYPTION_KEY');

@Injectable()
export class PaymentSecretsService {
  private readonly key?: Buffer;

  constructor(@Optional() @Inject(PAYMENT_SECRETS_ENCRYPTION_KEY) rawKey?: string) {
    const normalizedKey = rawKey?.trim();
    if (normalizedKey && !/^[a-f0-9]{64}$/i.test(normalizedKey)) {
      throw new BusinessException(ErrorCode.PAYMENT_SECRETS_SERVICE_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }
    this.key = normalizedKey ? Buffer.from(normalizedKey, 'hex') : undefined;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.requireKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.requireKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new BusinessException(ErrorCode.PAYMENT_SECRETS_SERVICE_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.key;
  }
}
