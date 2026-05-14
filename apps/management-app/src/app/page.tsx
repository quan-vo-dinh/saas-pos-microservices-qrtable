import type { Metadata } from 'next';
import Link from 'next/link';
import { landingMono, landingSans } from '@/app/landing-fonts';
import { getPublicLandingInfo, getPublicPlans } from '@/features/landing/landing-api';
import { LandingHeader } from '@/features/landing/landing-header';
import { HeroSection } from '@/features/landing/hero-section';
import { DashboardMacbookSection } from '@/features/landing/dashboard-macbook-section';
import { MetricsSection } from '@/features/landing/metrics-section';
import { TechPlatformReveal } from '@/features/landing/tech-platform-reveal';
import { DataFlowSection } from '@/features/landing/data-flow-section';
import { WorkflowSection } from '@/features/landing/workflow-section';
import { PricingSection } from '@/features/landing/pricing-section';
import { PaymentSection } from '@/features/landing/payment-section';
import { ContactSection } from '@/features/landing/contact-section';

export const metadata: Metadata = {
  title: 'QRTable — Đặt món qua QR, POS & thanh toán cho nhà hàng',
  description:
    'Giúp khách gọi món bằng điện thoại, nhân viên xử lý trên một màn hình, tiền bill về đúng tài khoản quán — tích hợp VietQR & SePay phổ biến tại Việt Nam.',
  openGraph: {
    title: 'QRTable — Vận hành nhà hàng gọn hơn với QR',
    description:
      'Menu luôn cập nhật, đơn về bếp nhanh, thanh toán minh bạch. Dành cho chủ quán và chuỗi F&B muốn giảm nhầm lẫn và tăng tốc phục vụ.',
    type: 'website',
  },
};

export default async function Home(): Promise<React.ReactElement> {
  const [plans, landing] = await Promise.all([getPublicPlans(), getPublicLandingInfo()]);

  return (
    <div
      className={`${landingSans.variable} ${landingMono.variable} landing-font-root min-h-dvh bg-zinc-950 text-zinc-100 antialiased`}
    >
      <a
        href="#main"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-block focus:rounded-md focus:bg-cyan-500 focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-zinc-950"
      >
        Bỏ qua điều hướng, vào nội dung chính
      </a>
      <LandingHeader productName={landing.productName} />
      <main id="main" tabIndex={-1} className="outline-none">
        <HeroSection />
        <MetricsSection />
        <TechPlatformReveal />
        <DataFlowSection />
        <WorkflowSection />
        <DashboardMacbookSection />
        <PricingSection plans={plans} />
        <PaymentSection />
        <ContactSection contactEmail={landing.contactEmail} />
      </main>
      <footer className="border-t border-zinc-900 py-6 text-center font-mono text-[10px] text-zinc-600">
        <Link href="/login" className="text-zinc-500 underline-offset-2 hover:text-cyan-400 hover:underline">
          Đăng nhập quản lý
        </Link>
        <span className="mx-2 text-zinc-700">·</span>
        <span>QRTable — thông tin thanh toán nhạy cảm chỉ xử lý trên máy chủ, an toàn cho quán và khách.</span>
      </footer>
    </div>
  );
}
