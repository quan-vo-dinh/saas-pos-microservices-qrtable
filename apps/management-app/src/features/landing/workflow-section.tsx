import { ClipboardList, Globe2, Link2, Users } from 'lucide-react';

const steps = [
  {
    title: 'Định danh & tenant',
    body: 'Người dùng có tài khoản; Super Admin tạo tenant nhà hàng, slug riêng và gán gói — dữ liệu tách biệt theo cửa hàng.',
    icon: Users,
  },
  {
    title: 'Thiết lập vận hành VN',
    body: 'Mặc định VND và tiếng Việt; cấu hình khu vực, bàn, in QR theo template — sẵn sàng phục vụ khách tại bàn.',
    icon: Globe2,
  },
  {
    title: 'Catalog & realtime',
    body: 'Danh mục và món: hiển thị theo khung giờ, trạng thái còn/hết; thay đổi đồng bộ ngay tới PWA khách và POS.',
    icon: ClipboardList,
  },
  {
    title: 'SePay & hai tầng tiền',
    body: 'OAuth theo từng nhà hàng; webhook Tier 1 cho bill (QRTBL…) và Tier 2 cho subscription (QRSUB…) — tách bạch luồng tiền.',
    icon: Link2,
  },
] as const;

export function WorkflowSection(): React.ReactElement {
  return (
    <section aria-labelledby="trien-khai-heading" className="qrt-landing__band border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="trien-khai-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Triển khai có kiểm soát cho chủ quán
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Không phải “đăng ký xong tự mò”. Luồng Phase 4B ưu tiên onboarding qua vận hành nền tảng: đảm bảo tenant, gói và
          kết nối thanh toán được cấu hình đúng trước khi mở rộng quy mô.
        </p>
        <ul className="mt-12 grid list-none gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="qrt-glass flex flex-col rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Bước {i + 1}</p>
                  <p className="mt-0.5 font-semibold leading-snug text-foreground">{s.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
