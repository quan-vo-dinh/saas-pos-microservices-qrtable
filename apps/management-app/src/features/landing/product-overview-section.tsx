import { Building2, Radio, Store } from 'lucide-react';

const pillars = [
  {
    title: 'SaaS đa tenant',
    body:
      'Mỗi nhà hàng là một tenant dữ liệu tách biệt: đơn hàng, thực đơn, bàn và cấu hình thanh toán không lẫn giữa các cửa hàng. Super Admin kiểm soát onboarding và trạng thái hoạt động (Active / Suspended / Closed).',
    icon: Building2,
  },
  {
    title: 'QR đặt món & POS',
    body:
      'Khách quét QR theo bàn để mở phiên đặt món; nhân viên dùng POS quản lý sơ đồ bàn, đơn và luồng phục vụ. Menu điện tử đồng bộ tức thì khi đổi giá hoặc hết món.',
    icon: Store,
  },
  {
    title: 'Realtime vận hành',
    body:
      'Thay đổi catalog, trạng thái món và luồng bếp/KDS được đẩy realtime tới thiết bị phục vụ và PWA khách — giảm lệch thông tin giữa sàn và bếp trong giờ cao điểm.',
    icon: Radio,
  },
] as const;

export function ProductOverviewSection(): React.ReactElement {
  return (
    <section id="tong-quan" aria-labelledby="tong-quan-heading" className="qrt-landing__band border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 id="tong-quan-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Một nền tảng cho vận hành F&amp;B theo bàn
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            QRTable gắn <span className="font-medium text-foreground">định danh bàn</span>,{' '}
            <span className="font-medium text-foreground">phiên khách</span> và{' '}
            <span className="font-medium text-foreground">đơn hàng</span> vào cùng một luồng dữ liệu — phù hợp nhà hàng
            cần rõ ràng, có kiểm soát, không phụ thuộc nhiều công cụ rời rạc.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <li
              key={p.title}
              className="qrt-glass flex flex-col rounded-xl p-6 shadow-sm"
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <p.icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
