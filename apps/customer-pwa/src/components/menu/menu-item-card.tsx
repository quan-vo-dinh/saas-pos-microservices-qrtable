import { Plus } from 'lucide-react';
import type { PublicMenuItem } from '@einvoice/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { cn } from '@/lib/utils';

export type MenuItemCardFlags = {
  hasGluten: boolean;
  hasPeanut: boolean;
  promoFlag: boolean;
};

export function deriveMenuItemFlags(id: string): MenuItemCardFlags {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % 997;
  return {
    hasGluten: h % 3 === 0,
    hasPeanut: h % 5 === 0,
    promoFlag: h % 4 === 0,
  };
}

type MenuItemCardProps = {
  item: PublicMenuItem;
  onOpenDetail: (item: PublicMenuItem) => void;
  onQuickAdd: (item: PublicMenuItem) => void;
  disabled?: boolean;
};

export function MenuItemCard({ item, onOpenDetail, onQuickAdd, disabled }: MenuItemCardProps): React.ReactElement {
  const out = item.status === 'out_of_stock';
  const flags = deriveMenuItemFlags(item.id);
  const isDisabled = Boolean(disabled) || out;

  const handleAdd = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (isDisabled) {
      if (out) navigator.vibrate?.(50);
      return;
    }
    onQuickAdd(item);
  };

  const showBadges = flags.hasGluten || flags.hasPeanut || flags.promoFlag;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => !isDisabled && onOpenDetail(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isDisabled) onOpenDetail(item);
        }
      }}
      className={cn(
        'relative flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-border/80 p-0 shadow-sm transition-shadow',
        !isDisabled && 'cursor-pointer hover:shadow-md',
        isDisabled && 'opacity-80',
      )}
    >
      {out && (
        <div
          className="pointer-events-none absolute inset-x-0 top-[42%] z-10 -translate-y-1/2 rotate-[-10deg] bg-destructive/92 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-destructive-foreground shadow-sm"
          aria-hidden
        >
          Hết món
        </div>
      )}
      {/* Fixed 1:1 frame — image fills square, no corner gap */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-3xl font-semibold text-muted-foreground">
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-1.5 p-3 pt-2.5">
        {showBadges && (
          <div className="flex flex-wrap gap-1">
            {flags.hasGluten && (
              <Badge variant="outline" className="text-[10px] leading-none">
                Gluten
              </Badge>
            )}
            {flags.hasPeanut && (
              <Badge variant="outline" className="text-[10px] leading-none">
                Đậu phộng
              </Badge>
            )}
            {flags.promoFlag && (
              <Badge variant="secondary" className="text-[10px] leading-none">
                Ưu đãi
              </Badge>
            )}
          </div>
        )}

        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.name}</p>

        {item.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-0.5">
          {flags.promoFlag ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="min-w-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Đã giảm 10.000đ so với menu giấy (mock)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="min-w-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
          )}
          <Button
            type="button"
            size="icon"
            variant="default"
            className="size-9 shrink-0 rounded-full"
            disabled={isDisabled}
            aria-label={out ? 'Món đã hết' : 'Thêm vào giỏ'}
            onClick={handleAdd}
          >
            <Plus className="size-[1.125rem]" data-icon="inline-start" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
