import { Building2, CreditCard, Link2, UserCog } from 'lucide-react';

const steps = [
  {
    title: 'SUPER_ADMIN onboard',
    body: 'Tạo tenant, gán gói ban đầu và mở quyền vận hành.',
    icon: UserCog,
  },
  {
    title: 'Chủ quán đăng nhập',
    body: 'Xem gói cước, gia hạn subscription qua VietQR tự động.',
    icon: Building2,
  },
  {
    title: 'Kết nối SePay',
    body: 'OAuth2 Connect — mỗi nhà hàng ủy quyền tài khoản SePay riêng.',
    icon: Link2,
  },
  {
    title: 'Khách thanh toán bill',
    body: 'VietQR Tier 1 về tài khoản nhà hàng; subscription Tier 2 về nền tảng.',
    icon: CreditCard,
  },
] as const;

export function WorkflowSection(): React.ReactElement {
  return (
    <section className="border-b border-border/80 bg-muted/20 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold tracking-tight">Luồng vận hành</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Từ onboarding có kiểm soát đến thanh toán hai tầng — phù hợp demo SaaS F&B tại Việt Nam.
        </p>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-lg border border-border bg-card p-4 shadow-sm" style={{ borderRadius: '8px' }}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <s.icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Bước {i + 1}</p>
                <p className="mt-1 font-semibold leading-snug">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
