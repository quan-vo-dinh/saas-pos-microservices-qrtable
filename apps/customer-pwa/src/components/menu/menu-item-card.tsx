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
        'relative overflow-hidden border-border/80 transition-shadow',
        !isDisabled && 'cursor-pointer hover:shadow-md',
        isDisabled && 'opacity-80',
      )}
    >
      {out && (
        <div
          className="absolute inset-x-0 top-8 z-10 rotate-[-8deg] bg-destructive/90 py-1 text-center text-xs font-semibold text-destructive-foreground shadow-sm"
          aria-hidden
        >
          Hết món
        </div>
      )}
      <div className="aspect-square w-full bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-2xl font-semibold text-muted-foreground">
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          {flags.hasGluten && (
            <Badge variant="outline" className="text-[10px]">
              Gluten
            </Badge>
          )}
          {flags.hasPeanut && (
            <Badge variant="outline" className="text-[10px]">
              Đậu phộng
            </Badge>
          )}
          {flags.promoFlag && (
            <Badge variant="secondary" className="text-[10px]">
              Ưu đãi
            </Badge>
          )}
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{item.name}</p>
        <div className="flex items-end justify-between gap-2">
          {flags.promoFlag ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  Đã giảm 10.000đ so với menu giấy (mock)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
          )}
          <Button
            type="button"
            size="icon"
            variant="default"
            className="size-10 shrink-0 rounded-full"
            disabled={isDisabled}
            aria-label={out ? 'Món đã hết' : 'Thêm vào giỏ'}
            onClick={handleAdd}
          >
            <Plus className="size-5" data-icon="inline-start" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
