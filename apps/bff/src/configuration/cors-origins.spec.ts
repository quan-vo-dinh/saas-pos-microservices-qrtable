import { createCorsOriginValidator, parseCorsOrigins } from './cors-origins';

describe('parseCorsOrigins', () => {
  it('should trim, filter empty elements, and deduplicate origins', () => {
    const raw = ' https://app.example.com ,  https://qr.example.com , https://app.example.com ';
    const result = parseCorsOrigins(raw, 'development');
    expect(result).toEqual(['https://app.example.com', 'https://qr.example.com']);
  });

  it('should return wildcard when empty in development mode', () => {
    const result = parseCorsOrigins('', 'development');
    expect(result).toEqual(['*']);

    const undefinedResult = parseCorsOrigins(undefined, 'development');
    expect(undefinedResult).toEqual(['*']);
  });

  it('should throw an error when empty or undefined in production mode', () => {
    expect(() => parseCorsOrigins('', 'production')).toThrow(
      'CORS_ORIGINS environment variable is required in production mode',
    );
    expect(() => parseCorsOrigins(undefined, 'production')).toThrow(
      'CORS_ORIGINS environment variable is required in production mode',
    );
  });

  it('should throw an error when wildcard is specified in production mode', () => {
    expect(() => parseCorsOrigins('*', 'production')).toThrow('Wildcard origin "*" is not allowed in production mode');
    expect(() => parseCorsOrigins('https://app.example.com, *', 'production')).toThrow(
      'Wildcard origin "*" is not allowed in production mode',
    );
    expect(() => parseCorsOrigins('https://*.example.com', 'production')).toThrow(
      'Wildcard origin "https://*.example.com" is not allowed in production mode',
    );
  });

  it('should accept valid explicit origins in production mode', () => {
    const raw = 'https://app.qrtable.vodinhquan.dev,https://qr.qrtable.vodinhquan.dev';
    const result = parseCorsOrigins(raw, 'production');
    expect(result).toEqual(['https://app.qrtable.vodinhquan.dev', 'https://qr.qrtable.vodinhquan.dev']);
  });
});

describe('createCorsOriginValidator', () => {
  const managementOrigin = 'https://app.qrtable.vodinhquan.dev';
  const customerOrigin = 'https://qr.qrtable.vodinhquan.dev';
  const validator = createCorsOriginValidator([managementOrigin, customerOrigin]);

  it.each([managementOrigin, customerOrigin])('allows configured origin %s', (origin) => {
    const callback = jest.fn();

    validator(origin, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects an unlisted browser origin', () => {
    const callback = jest.fn();

    validator('https://untrusted.example', callback);

    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it('allows requests without an Origin header', () => {
    const callback = jest.fn();

    validator(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('allows every origin when development wildcard is configured', () => {
    const callback = jest.fn();

    createCorsOriginValidator(['*'])('http://localhost:4200', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
