import { KeyRound } from 'lucide-react';
import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    callbackUrl?: string;
  }>;
};

function sanitizeNextPath(nextPath?: string): string {
  if (!nextPath) {
    return '/';
  }

  if (nextPath.startsWith('http://') || nextPath.startsWith('https://')) {
    return '/';
  }

  if (!nextPath.startsWith('/')) {
    return '/';
  }

  if (nextPath.startsWith('//')) {
    return '/';
  }

  return nextPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = sanitizeNextPath(params.next ?? params.callbackUrl);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Authentication</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to QRTable Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Redirect authentication is handled by Keycloak. After login, you will return to the correct role route.
        </p>
        <div className="mt-6 flex gap-3">
          <form
            action={async () => {
              'use server';
              await signIn('keycloak', { redirectTo: callbackUrl });
            }}
          >
            <Button type="submit">
              <KeyRound data-icon="inline-start" />
              Continue with Keycloak
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
