import { UnauthorizedException } from '@nestjs/common';
import { assertSepayWebhookSecret } from '../verify-sepay-webhook-secret';

describe('assertSepayWebhookSecret', () => {
  it('rejects missing secret', () => {
    expect(() => assertSepayWebhookSecret(undefined, 'secret')).toThrow(UnauthorizedException);
  });

  it('rejects invalid secret', () => {
    expect(() => assertSepayWebhookSecret('wrong', 'secret')).toThrow(UnauthorizedException);
  });

  it('rejects empty configured secret', () => {
    expect(() => assertSepayWebhookSecret('anything', '')).toThrow(UnauthorizedException);
  });

  it('accepts matching secret', () => {
    expect(() => assertSepayWebhookSecret('secret', 'secret')).not.toThrow();
  });
});
