import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@einvoice/frontend-ui';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { CartActivityEvent, MockPresenceGuest } from '@/mocks/seed';

type PresenceAvatarsProps = {
  presence: MockPresenceGuest[];
  activity: CartActivityEvent[];
  maxVisible?: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeVi(at: number): string {
  const sec = Math.floor((Date.now() - at) / 1000);
  if (sec < 45) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const h = Math.floor(min / 60);
  return `${h} giờ trước`;
}

export function PresenceAvatars({
  presence,
  activity,
  maxVisible = 3,
}: PresenceAvatarsProps): React.ReactElement {
  const visible = presence.slice(0, maxVisible);
  const extra = Math.max(0, presence.length - maxVisible);
  const recent = activity.slice(0, 5);

  return (
    <HoverCard openDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-border bg-card/80 px-1.5 py-1 pr-2 shadow-sm"
          aria-label="Khách cùng bàn và hoạt động gần đây"
        >
          <Users className="ml-1 size-4 text-muted-foreground" aria-hidden />
          <div className="flex -space-x-2">
            {visible.map((p) => (
              <Avatar key={p.name} className="size-8 border-2 border-background text-xs">
                <AvatarFallback className="text-[10px] font-semibold" style={{ backgroundColor: `${p.color}33` }}>
                  {initials(p.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {extra > 0 && (
            <span className="text-xs font-medium tabular-nums text-muted-foreground">+{extra}</span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Khách cùng bàn</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {presence.map((p) => (
                <li key={p.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
                  <span>{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Hoạt động gần đây</p>
            <ul className="mt-2 flex flex-col gap-2">
              {recent.length === 0 ? (
                <li className="text-xs text-muted-foreground">Chưa có hoạt động</li>
              ) : (
                recent.map((a, i) => (
                  <li key={`${a.at}-${i}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{a.who}</span> {a.action}{' '}
                    <span className="text-foreground">{a.itemName}</span>
                    {a.qty > 1 ? ` ×${a.qty}` : ''} · {formatRelativeVi(a.at)}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
