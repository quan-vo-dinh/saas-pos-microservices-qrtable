import { PaymentSecretsService } from '../services/payment-secrets.service';

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
});
