import Link from 'next/link';
import { getPublicLandingInfo, getPublicPlans } from '@/features/landing/landing-api';
import { HeroSection } from '@/features/landing/hero-section';
import { PricingSection } from '@/features/landing/pricing-section';
import { WorkflowSection } from '@/features/landing/workflow-section';
import { PaymentSection } from '@/features/landing/payment-section';
import { ContactSection } from '@/features/landing/contact-section';

export default async function Home(): Promise<React.ReactElement> {
  const [plans, landing] = await Promise.all([getPublicPlans(), getPublicLandingInfo()]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {landing.productName}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#pricing" className="text-muted-foreground transition hover:text-foreground">
              Giá
            </a>
            <a href="#contact" className="text-muted-foreground transition hover:text-foreground">
              Liên hệ
            </a>
            <Link
              href="/login"
              className="rounded-md border border-border px-3 py-1.5 font-medium transition hover:bg-muted"
            >
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <HeroSection />
        <PricingSection plans={plans} />
        <WorkflowSection />
        <PaymentSection />
        <ContactSection contactEmail={landing.contactEmail} />
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} QRTable — SaaS POS đa tenant.
      </footer>
    </div>
  );
}
