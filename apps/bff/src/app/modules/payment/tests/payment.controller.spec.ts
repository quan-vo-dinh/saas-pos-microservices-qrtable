import { UnauthorizedException } from '@nestjs/common';

describe('Payment webhook security', () => {
  function verify(received: string | undefined, expected: string) {
    if (!received || received !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return true;
  }

  it('rejects missing secret', () => {
    expect(() => verify(undefined, 'secret')).toThrow(UnauthorizedException);
  });

  it('rejects invalid secret', () => {
    expect(() => verify('wrong', 'secret')).toThrow(UnauthorizedException);
  });

  it('accepts matching secret', () => {
    expect(verify('secret', 'secret')).toBe(true);
  });
});
