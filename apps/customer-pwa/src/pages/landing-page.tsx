import { QrLandingCard } from '@/features/landing/components/qr-landing-card';
import { SessionTimer } from '@/components/session/session-timer';
import { PresenceAvatars } from '@/components/session/presence-avatars';
import { usePwaMockStore } from '@/mocks/store';

export function LandingPage(): React.ReactElement {
  const session = usePwaMockStore((s) => s.session);
  const presence = usePwaMockStore((s) => s.presence);
  const activityFeed = usePwaMockStore((s) => s.activityFeed);

  return (
    <div className="flex min-h-[60vh] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/50 px-3 py-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phiên demo</p>
          <p className="truncate text-sm font-semibold text-foreground">{session.tableName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SessionTimer startedAt={session.startedAt} />
          <PresenceAvatars presence={presence} activity={activityFeed} />
        </div>
      </div>
      <QrLandingCard />
    </div>
  );
}
