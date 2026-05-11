import { NavLink } from 'react-router-dom';
import { buttonVariants } from '@einvoice/frontend-ui';
import { NAV_ITEMS } from '@/constants/nav-items';
import { ROUTES } from '@/constants/routes';
import { useSession } from '@/features/session/context/session-provider';
import { cn } from '@/lib/utils';

export function MobileHeader() {
  const { session } = useSession();

  const displayName = session?.restaurantName ?? 'QR Table';
  const displayTable = session?.tableName ?? '—';
  const displaySession = session?.sessionId ? `${session.sessionId.slice(0, 8)}…` : 'No active session';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-sm flex-col gap-4 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">QR Table Session</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{displayName}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Session: {displaySession}</p>
          </div>

          <div className="rounded-lg border border-border bg-card px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current Table</p>
            <p className="text-sm font-semibold text-card-foreground">{displayTable}</p>
          </div>
        </div>

        <nav aria-label="Customer flow navigation" className="grid grid-cols-4 gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to !== ROUTES.ORDER_TRACKING}
              className={({ isActive }) =>
                cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'h-auto min-h-0 flex-col gap-1.5 border py-2 text-[11px] no-underline',
                  isActive
                    ? 'border-primary/40 bg-primary/15 font-semibold text-foreground shadow-sm ring-2 ring-primary/35 [&_svg]:text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-border/80 [&_svg]:text-muted-foreground',
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
