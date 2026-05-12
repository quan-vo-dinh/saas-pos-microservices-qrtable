import { Armchair, Banknote, BrushCleaning, ScanLine } from 'lucide-react';

const states = [
  {
    key: 'available',
    label: 'Available',
    labelVi: 'Sẵn sàng',
    body: 'Bàn trống, sẵn sàng đón khách quét QR mở phiên đặt món.',
    icon: Armchair,
  },
  {
    key: 'occupied',
    label: 'Occupied',
    labelVi: 'Đang phục vụ',
    body: 'Khách đã vào phiên; đặt món, gọi món và đồng bộ realtime với POS/bếp.',
    icon: ScanLine,
  },
  {
    key: 'billing',
    label: 'Billing',
    labelVi: 'Chờ thanh toán',
    body: 'Khách yêu cầu thanh toán — có thể khóa đặt thêm theo rule nghiệp vụ để chốt bill.',
    icon: Banknote,
  },
  {
    key: 'cleaning',
    label: 'Cleaning',
    labelVi: 'Dọn bàn',
    body: 'Sau khi thanh toán xong; nhân viên xác nhận dọn để bàn quay lại trạng thái sẵn sàng.',
    icon: BrushCleaning,
  },
] as const;

export function TableLifecycleSection(): React.ReactElement {
  return (
    <section id="ban-va-qr" aria-labelledby="ban-heading" className="qrt-landing__band-muted border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h2 id="ban-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Bàn, QR và vòng đời trạng thái
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
              Mỗi bàn gắn URL QR an toàn (token HMAC) để mở phiên khách. Trạng thái bàn được quản lý theo state machine
              nghiệp vụ — giúp nhân viên biết bàn đang ở đâu trong luồng phục vụ.
            </p>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Giới hạn tần suất quét / đặt món theo bàn và timeout phiên idle được áp dụng ở tầng dịch vụ để giảm spam và
            phiên “treo”.
          </p>
        </div>

        <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {states.map((s, i) => (
            <li
              key={s.key}
              className="qrt-glass relative flex flex-col rounded-xl p-5 shadow-sm"
              style={{ counterIncrement: 'none' }}
            >
              <span
                className="absolute -left-1 -top-1 flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="flex items-center gap-3 pt-2">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden
                >
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="text-base font-semibold text-foreground">{s.labelVi}</p>
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
