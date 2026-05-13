import { Bot, CreditCard, Link2, UserCog } from 'lucide-react';
import styles from './landing.module.css';

const steps = [
  {
    title: 'Mở quán cùng chuyên viên',
    body: 'Chúng tôi tạo không gian riêng cho thương hiệu, gán gói phù hợp số bàn và nhân sự — bạn không phải tự mò cấu hình.',
    icon: UserCog,
    tag: '01',
  },
  {
    title: 'Kết nối ngân hàng (SePay)',
    body: 'Bạn ủy quyền một lần; tiền bill và phí dịch vụ được định tuyến đúng tài khoản — không lưu mật khẩu ngân hàng trên trình duyệt.',
    icon: Link2,
    tag: '02',
  },
  {
    title: 'Phục vụ hằng ngày',
    body: 'Cập nhật menu, nhận đơn từ khách, in bếp và chốt bill trên cùng một luồng — giảm gọi điện nội bộ.',
    icon: Bot,
    tag: '03',
  },
  {
    title: 'Đối soát cuối ngày',
    body: 'Bill khách về tài khoản quán; phí gói QRTable tách riêng — nhìn báo cáo là biết thực thu.',
    icon: CreditCard,
    tag: '04',
  },
] as const;

export function WorkflowSection(): React.ReactElement {
  return (
    <section
      id="automation"
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-900 py-14 sm:py-20`}
      aria-labelledby="qrt-auto-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgDiagonal}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgGridFine}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialEmerald}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="qrt-auto-heading" className="font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Bốn bước để quán chạy QRTable
          </h2>
          <p className="mt-3 font-sans text-sm text-zinc-500">
            Chúng tôi xử lý phần kỹ thuật lặp lại; chủ quán tập trung menu, nhân sự và trải nghiệm khách — can thiệp khi cần
            đổi quy trình riêng.
          </p>
        </div>

        <div className="relative mt-12">
          <svg
            className="pointer-events-none absolute left-1/2 top-[6%] z-0 hidden h-[82%] w-[min(100%,72rem)] max-w-[calc(100%-1rem)] -translate-x-1/2 opacity-[0.36] lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path className={styles.flowLoopPath} d="M 5 80 L 95 80 L 95 18 L 5 18 Z" />
          </svg>
          <ol className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li
                key={s.tag}
                className={`${styles.cardFlowShimmer} relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/65 p-5 backdrop-blur-[2px] transition hover:border-zinc-600`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{s.tag}</span>
                  <div className="flex size-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-cyan-300">
                    <s.icon className="size-4" aria-hidden />
                  </div>
                </div>
                <h3 className="mt-4 font-sans text-base font-semibold text-zinc-100">{s.title}</h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-zinc-500">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
