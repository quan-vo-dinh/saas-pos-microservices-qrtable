import { Check, X } from 'lucide-react';

const rows = [
  {
    aspect: 'Định danh theo bàn + phiên khách',
    qrtable: true,
    legacy: false,
  },
  {
    aspect: 'Menu & hết món cập nhật realtime cho khách',
    qrtable: true,
    legacy: 'partial',
  },
  {
    aspect: 'Tách bill khách (Tier 1) và cước SaaS (Tier 2)',
    qrtable: true,
    legacy: false,
  },
  {
    aspect: 'Kết nối ngân hàng qua SePay OAuth (theo tenant)',
    qrtable: true,
    legacy: false,
  },
  {
    aspect: 'Cô lập dữ liệu đa tenant',
    qrtable: true,
    legacy: false,
  },
] as const;

function Cell({ value }: { value: boolean | 'partial' }): React.ReactElement {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
        <Check className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Có</span>
      </span>
    );
  }
  if (value === 'partial') {
    return <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Một phần / tùy quán</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <X className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">Không hoặc thủ công</span>
    </span>
  );
}

export function ComparisonSection(): React.ReactElement {
  return (
    <section id="so-sanh" aria-labelledby="so-sanh-heading" className="qrt-landing__band-muted border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="so-sanh-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          QRTable so với vận hành “tách rời công cụ”
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Bảng so sánh mang tính định hướng cho chủ quán: khi quy trình QR, POS, thanh toán và đăng ký nằm trên một nền tảng,
          giảm sai lệch dữ liệu và chi phí tích hợp.
        </p>

        <div className="qrt-glass mt-10 overflow-x-auto rounded-xl shadow-sm">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">So sánh QRTable với mô hình vận hành truyền thống</caption>
            <thead>
              <tr className="border-b border-border/60 bg-muted/25">
                <th scope="col" className="px-4 py-3 font-semibold text-foreground sm:px-6">
                  Tiêu chí
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground sm:px-6">
                  QRTable
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-muted-foreground sm:px-6">
                  Nhiều công cụ rời
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.aspect} className="border-b border-border/60 last:border-0 odd:bg-background/25 even:bg-muted/15">
                  <th scope="row" className="px-4 py-3.5 font-medium text-foreground sm:px-6">
                    {r.aspect}
                  </th>
                  <td className="px-4 py-3.5 sm:px-6">
                    <Cell value={r.qrtable} />
                  </td>
                  <td className="px-4 py-3.5 sm:px-6">
                    <Cell value={r.legacy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Kết luận ngắn: một luồng dữ liệu từ bàn → bếp → thanh toán → gói dịch vụ.</p>
          <a
            href="#pricing"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.02]"
          >
            Xem bảng giá
          </a>
        </div>
      </div>
    </section>
  );
}
