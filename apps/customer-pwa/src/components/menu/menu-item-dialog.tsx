import { faker } from '@faker-js/faker';
import type { MenuItem } from '@einvoice/types';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@einvoice/frontend-ui';
import { Star } from 'lucide-react';
import { formatCurrency } from '@einvoice/frontend-utils';
import { deriveMenuItemFlags } from '@/components/menu/menu-item-card';

type MenuItemDialogProps = {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function StarRow({ value }: { value: number }): React.ReactElement {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Đánh giá trung bình ${value} trên 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cnStar(i < Math.round(value))}
          aria-hidden
        />
      ))}
    </div>
  );
}

function cnStar(on: boolean): string {
  return on ? 'size-4 fill-primary text-primary' : 'size-4 text-muted-foreground/40';
}

export function MenuItemDialog({ item, open, onOpenChange }: MenuItemDialogProps): React.ReactElement | null {
  if (!item) return null;

  faker.seed(item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const flags = deriveMenuItemFlags(item.id);
  const calories = faker.number.int({ min: 180, max: 720 });
  const todayOrders = faker.number.int({ min: 3, max: 40 });
  const avgRating = Math.round((3.8 + ((item.id.length % 12) / 10)) * 10) / 10;

  const reviews = [
    { author: 'Minh A.', text: 'Rất ngon, vừa miệng.', stars: 5 },
    { author: 'Lan B.', text: 'Phục vụ nhanh, món ấm.', stars: 4 },
    { author: 'Hùng C.', text: 'Sẽ gọi lại lần sau.', stars: 5 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-semibold text-muted-foreground">
              {item.name.slice(0, 1)}
            </div>
          )}
        </div>

        <Tabs defaultValue="desc" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desc">Mô tả</TabsTrigger>
            <TabsTrigger value="top" disabled className="opacity-60" title="Phase sau">
              Topping
            </TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
          </TabsList>
          <TabsContent value="desc" className="mt-3 flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              {item.description ?? `${item.name} — món đặc trưng, chế biến tươi theo đơn (mock).`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{calories} kcal (ước lượng)</Badge>
              {flags.hasGluten && <Badge variant="outline">Gluten</Badge>}
              {flags.hasPeanut && <Badge variant="outline">Đậu phộng</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <StarRow value={avgRating} />
              <span className="text-xs text-muted-foreground">{todayOrders} người đặt hôm nay (mock)</span>
            </div>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(item.price)}</p>
          </TabsContent>
          <TabsContent value="reviews" className="mt-3 flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.author} className="rounded-lg border border-border/80 bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.author}</p>
                  <StarRow value={r.stars} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
