import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Authentication</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to QRTable Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step 0.7 skeleton login page. Final Keycloak OIDC redirect flow will be wired in auth integration step.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/auth/callback?role=OWNER">
              <KeyRound data-icon="inline-start" />
              Continue with Keycloak
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Preview shell</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
