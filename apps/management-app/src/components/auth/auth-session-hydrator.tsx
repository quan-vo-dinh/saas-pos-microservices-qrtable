'use client';

import { useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useAuthStore } from '@/lib/auth/auth-store';

type ProfilePayload = {
  userId: string;
  email?: string;
  tenantId?: string;
  roles?: string[];
  permissions?: string[];
};

export function AuthSessionHydrator() {
  const { data: session, status } = useSession();
  const isSigningIn = useRef(false);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const reset = useAuthStore((state) => state.reset);

  useEffect(() => {
    if (status === 'unauthenticated') {
      reset();
    }
  }, [reset, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) {
      return;
    }

    if (session.error === 'RefreshAccessTokenError' && !isSigningIn.current) {
      isSigningIn.current = true;
      void signIn('keycloak', {
        callbackUrl: window.location.pathname + window.location.search,
      });
      return;
    }

    let cancelled = false;

    void fetch('/api/internal/me', {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error('UNAUTHORIZED');
        }

        if (!response.ok) {
          throw new Error('PROFILE_FETCH_FAILED');
        }

        return (await response.json()) as ProfilePayload;
      })
      .then((profile) => {
        if (cancelled) {
          return;
        }

        setAccessToken(session.accessToken ?? null);
        setProfile({
          userId: profile.userId,
          email: profile.email,
          tenantId: profile.tenantId,
          roles: profile.roles ?? [],
          permissions: profile.permissions ?? [],
        });
        setHydrated(true);
      })
      .catch((error: Error) => {
        if (cancelled) {
          return;
        }

        if (error.message === 'UNAUTHORIZED') {
          // Keep the current authenticated session and hydrate from JWT claims to avoid login loops.
          setAccessToken(session.accessToken ?? null);
          setProfile({
            userId: session.user?.id ?? '',
            email: session.user?.email ?? undefined,
            tenantId: session.user?.tenantId,
            roles: session.user?.roles ?? [],
            permissions: session.user?.permissions ?? [],
          });
          setHydrated(true);
          return;
        }

        reset();
      });

    return () => {
      cancelled = true;
    };
  }, [
    reset,
    session?.accessToken,
    session?.error,
    session?.user?.email,
    session?.user?.id,
    session?.user?.permissions,
    session?.user?.roles,
    session?.user?.tenantId,
    setAccessToken,
    setHydrated,
    setProfile,
    status,
  ]);

  return null;
}
