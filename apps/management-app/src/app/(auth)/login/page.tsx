import { KeyRound } from 'lucide-react';
import { signIn } from '@/auth';
import { Button } from '@einvoice/frontend-ui';

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
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Xác thực</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Đăng nhập QRTable Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng nhập qua Keycloak. Sau khi xác thực, bạn sẽ được chuyển tới trang phù hợp với vai trò của mình.
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
              Tiếp tục với Keycloak
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
