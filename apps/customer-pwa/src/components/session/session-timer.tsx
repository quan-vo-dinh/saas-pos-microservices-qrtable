import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@einvoice/frontend-ui';
import { Popover, PopoverContent, PopoverTrigger } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';

type SessionTimerProps = {
  startedAt: number;
  /** Default 2h — informational for popover copy */
  lifetimeMs?: number;
  /** Idle warning copy */
  idleMs?: number;
  className?: string;
};

function formatClock(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function SessionTimer({
  startedAt,
  lifetimeMs = 2 * 60 * 60 * 1000,
  idleMs = 30 * 60 * 1000,
  className,
}: SessionTimerProps): React.ReactElement {
  const [elapsedMin, setElapsedMin] = useState(() => Math.floor(Math.max(0, Date.now() - startedAt) / 60_000));
  useEffect(() => {
    const tick = () => setElapsedMin(Math.floor(Math.max(0, Date.now() - startedAt) / 60_000));
    const id = window.setInterval(tick, 5000);
    tick();
    return () => window.clearInterval(id);
  }, [startedAt]);

  const remainingMs = Math.max(0, lifetimeMs - (Date.now() - startedAt));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex shrink-0', className)}
          aria-label="Thông tin phiên và thời gian"
        >
          <Badge variant="secondary" className="gap-1.5 px-2 py-1 font-medium tabular-nums">
            <Clock className="size-3.5" aria-hidden />
            {elapsedMin}m
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm" align="end">
        <p className="font-medium text-foreground">Phiên đặt món</p>
        <p className="mt-2 text-muted-foreground">
          Phiên bắt đầu lúc {formatClock(startedAt)}. Nếu không hoạt động trong khoảng{' '}
          {Math.round(idleMs / 60_000)} phút, phiên có thể tự đóng theo chính sách nhà hàng.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Gợi ý: còn khoảng {Math.max(0, Math.floor(remainingMs / 60_000))} phút trong khung 2 giờ.
        </p>
      </PopoverContent>
    </Popover>
  );
}
