import { Test } from '@nestjs/testing';
import { PAYMENT_SECRETS_ENCRYPTION_KEY, PaymentSecretsService } from '../services/payment-secrets.service';

describe('PaymentSecretsService', () => {
  const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('encrypts and decrypts token without returning plaintext ciphertext', () => {
    const service = new PaymentSecretsService(key);
    const encrypted = service.encrypt('secret-token');
    expect(encrypted).not.toContain('secret-token');
    expect(service.decrypt(encrypted)).toBe('secret-token');
  });

  it('rejects invalid key length', () => {
    expect(() => new PaymentSecretsService('short')).toThrow('PAYMENT_SECRETS_ENCRYPTION_KEY');
  });

  it('resolves through Nest DI with an explicit encryption-key provider', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentSecretsService,
        {
          provide: PAYMENT_SECRETS_ENCRYPTION_KEY,
          useValue: key,
        },
      ],
    }).compile();

    const service = moduleRef.get(PaymentSecretsService);
    expect(service.decrypt(service.encrypt('di-secret'))).toBe('di-secret');
  });

  it('can boot without a local dev key and fails only when encryption is used', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentSecretsService,
        {
          provide: PAYMENT_SECRETS_ENCRYPTION_KEY,
          useValue: undefined,
        },
      ],
    }).compile();

    const service = moduleRef.get(PaymentSecretsService);
    expect(() => service.encrypt('missing-key')).toThrow('PAYMENT_SECRETS_ENCRYPTION_KEY');
  });
});
