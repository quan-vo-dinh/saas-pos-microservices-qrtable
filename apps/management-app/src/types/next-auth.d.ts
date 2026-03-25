import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      roles: string[];
      tenantId?: string;
      permissions: string[];
    };
  }

  interface User {
    id?: string;
    roles?: string[];
    tenantId?: string;
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
    tenantId?: string;
    permissions?: string[];
    userId?: string;
    error?: string;
  }
}
