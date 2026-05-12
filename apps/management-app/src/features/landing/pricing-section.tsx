import type { PricingPlan } from '@/features/saas/types';

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(n)} đ`;
}

type PricingSectionProps = {
  plans: PricingPlan[];
};

export function PricingSection({ plans }: PricingSectionProps): React.ReactElement {
  const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <section id="pricing" className="border-b border-border/80 bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Bảng giá công khai</h2>
          <p className="mt-3 text-muted-foreground">
            Giá VND / tháng (tham khảo). Phase 4B không mở đăng ký tự phục vụ — mọi gói đều kèm bước liên hệ triển khai với đội
            QRTable.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {sorted.map((plan) => {
            const emphasized = plan.code === 'BASIC';
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-lg border bg-card p-6 shadow-sm ${
                  emphasized ? 'border-primary ring-2 ring-primary/25 md:-translate-y-1' : 'border-border'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {emphasized ? (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Phổ biến</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description ?? `Gói ${plan.code}`}</p>
                <p className="mt-4 text-3xl font-bold tabular-nums">{formatVnd(plan.priceVnd)}</p>
                <p className="text-xs text-muted-foreground">mỗi tháng · {plan.billingPeriod}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">{plan.maxTables}</span> bàn
                  </li>
                  <li>
                    <span className="font-medium text-foreground">{plan.maxStaff}</span> nhân sự
                  </li>
                  <li>
                    <span className="font-medium text-foreground">{plan.maxOrdersPerDay}</span> đơn / ngày (HCM)
                  </li>
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Liên hệ triển khai
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
