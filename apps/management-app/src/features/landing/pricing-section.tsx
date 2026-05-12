import type { PricingPlan } from '@/features/saas/types';
import { Check } from 'lucide-react';

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(n)} đ`;
}

type PricingSectionProps = {
  plans: PricingPlan[];
};

export function PricingSection({ plans }: PricingSectionProps): React.ReactElement {
  const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);
  const hasPlans = sorted.length > 0;

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="qrt-landing__band border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Bảng giá công khai (VND)
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
            Số liệu lấy từ API công khai của nền tảng (cache ngắn). Phase 4B không bật đăng ký tự phục vụ — mọi gói đều đi
            kèm bước liên hệ triển khai để cấu hình tenant, quota và SePay đúng quy trình.
          </p>
        </div>

        {!hasPlans ? (
          <p className="qrt-glass mt-10 rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
            Hiện chưa có dữ liệu gói công khai. Vui lòng thử lại sau hoặc liên hệ triển khai.
          </p>
        ) : (
          <ul className="mt-12 grid list-none gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((plan) => {
              const emphasized = plan.code === 'BASIC';
              return (
                <li
                  key={plan.id}
                  className={`qrt-glass flex flex-col rounded-2xl border p-6 shadow-sm ${
                    emphasized
                      ? 'border-primary ring-2 ring-primary/25 motion-safe:lg:-translate-y-0.5'
                      : 'border-border/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description ?? `Gói ${plan.code}`}</p>
                    </div>
                    {emphasized ? (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                        Phổ biến
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-6 text-3xl font-bold tabular-nums tracking-tight text-foreground">{formatVnd(plan.priceVnd)}</p>
                  <p className="text-xs text-muted-foreground">mỗi tháng · {plan.billingPeriod}</p>
                  <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                      <dt>Bàn tối đa</dt>
                      <dd className="font-medium tabular-nums text-foreground">{plan.maxTables}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-border/60 py-2">
                      <dt>Nhân sự</dt>
                      <dd className="font-medium tabular-nums text-foreground">{plan.maxStaff}</dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt>Đơn / ngày (quota)</dt>
                      <dd className="font-medium tabular-nums text-foreground">{plan.maxOrdersPerDay}</dd>
                    </div>
                  </dl>
                  <ul className="mt-4 flex flex-1 flex-col gap-2.5 text-sm text-muted-foreground">
                    {plan.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#contact"
                    className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.01]"
                  >
                    Liên hệ triển khai
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
