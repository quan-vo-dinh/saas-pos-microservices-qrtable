'use client';

import { useAuthStore } from '@/lib/auth/auth-store';

/**
 * BFF calls must wait until {@link AuthSessionHydrator} has written the access token
 * into the client store; otherwise requests go out without Authorization and return 401.
 */
export function useAuthReadyForBff(): boolean {
  return useAuthStore((s) => s.hydrated && Boolean(s.accessToken));
}
