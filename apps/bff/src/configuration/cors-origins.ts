export type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;
export type CorsOriginValidator = (requestOrigin: string | undefined, callback: CorsOriginCallback) => void;

export function parseCorsOrigins(rawOrigins: string | undefined, nodeEnv: string): readonly string[] {
  const env = (nodeEnv || 'development').trim().toLowerCase();
  const isProd = env === 'production';

  if (!rawOrigins || rawOrigins.trim() === '') {
    if (isProd) {
      throw new Error('CORS_ORIGINS environment variable is required in production mode');
    }
    return Object.freeze(['*']);
  }

  const parsed = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const uniqueOrigins = Array.from(new Set(parsed));

  if (isProd) {
    if (uniqueOrigins.length === 0) {
      throw new Error('CORS_ORIGINS must contain at least one valid origin in production mode');
    }
    for (const origin of uniqueOrigins) {
      if (origin === '*' || origin.includes('*')) {
        throw new Error(`Wildcard origin "${origin}" is not allowed in production mode`);
      }
    }
  }

  return Object.freeze(uniqueOrigins);
}

export function createCorsOriginValidator(allowedOrigins: readonly string[]): CorsOriginValidator {
  const allowsAnyOrigin = allowedOrigins.includes('*');
  const allowlist = new Set(allowedOrigins);

  return (requestOrigin, callback) => {
    if (!requestOrigin || allowsAnyOrigin || allowlist.has(requestOrigin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}
