import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">OIDC Callback</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Authentication Callback Placeholder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is the callback endpoint skeleton. In auth integration, token exchange and secure cookie setup happen here.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/dashboard">Continue</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
