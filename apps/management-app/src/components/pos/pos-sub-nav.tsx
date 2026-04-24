'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { useMockStore } from '@/mocks/store';

const links = [
  { href: ROUTES.POS, label: 'Live Orders' },
  { href: ROUTES.POS_TABLES, label: 'Tables' },
  { href: ROUTES.POS_SERVICE_REQUESTS, label: 'Service' },
  { href: ROUTES.POS_BILLS, label: 'Bills' },
] as const;

export function PosSubNav() {
  const pathname = usePathname();
  const servicePending = useMockStore(
    (s) => s.serviceRequests.filter((r) => r.status === 'PENDING').length,
  );
  const billsPending = useMockStore((s) => s.bills.filter((b) => b.status === 'PENDING_PAYMENT').length);

  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 bg-card/30 p-1"
      aria-label="POS sections"
    >
      {links.map((l) => {
        const active = pathname === l.href || (l.href !== ROUTES.POS && pathname.startsWith(l.href));
        const count =
          l.href === ROUTES.POS_SERVICE_REQUESTS ? servicePending : l.href === ROUTES.POS_BILLS ? billsPending : null;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {l.label}
            {count != null && count > 0 ? (
              <span
                className={cn(
                  'rounded-sm px-1.5 text-[0.65rem] tabular-nums',
                  active ? 'bg-primary-foreground/20' : 'bg-destructive/20 text-destructive',
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
