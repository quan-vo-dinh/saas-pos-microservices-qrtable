import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/constants/nav-items';
import { useSession } from '@/features/session/context/session-provider';

export function MobileHeader() {
  const { session } = useSession();

  const displayName = session?.restaurantName ?? 'QR Table';
  const displayTable = session?.tableName ?? '—';
  const displaySession = session?.sessionId
    ? `${session.sessionId.slice(0, 8)}…`
    : 'No active session';

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
            <Button
              key={item.to}
              asChild
              size="sm"
              variant="ghost"
              className="h-auto flex-col gap-1.5 py-2 text-[11px]"
            >
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'bg-primary/10 text-foreground ring-1 ring-border' : 'text-muted-foreground'
                }
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
