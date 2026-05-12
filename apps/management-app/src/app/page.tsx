import { getPublicLandingInfo, getPublicPlans } from '@/features/landing/landing-api';
import { HeroSection } from '@/features/landing/hero-section';
import { PricingSection } from '@/features/landing/pricing-section';
import { WorkflowSection } from '@/features/landing/workflow-section';
import { PaymentSection } from '@/features/landing/payment-section';
import { ContactSection } from '@/features/landing/contact-section';
import { ProductOverviewSection } from '@/features/landing/product-overview-section';
import { TableLifecycleSection } from '@/features/landing/table-lifecycle-section';
import { ComparisonSection } from '@/features/landing/comparison-section';
import { LandingHeader } from '@/features/landing/landing-header';
import { LandingFooter } from '@/features/landing/landing-footer';
import '@/features/landing/landing.css';

export default async function Home(): Promise<React.ReactElement> {
  const [plans, landing] = await Promise.all([getPublicPlans(), getPublicLandingInfo()]);

  return (
    <div className="qrt-landing min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Bỏ qua điều hướng tới nội dung chính
      </a>
      <LandingHeader productName={landing.productName} />
      <main id="main">
        <HeroSection productName={landing.productName} />
        <ProductOverviewSection />
        <TableLifecycleSection />
        <WorkflowSection />
        <ComparisonSection />
        <PricingSection plans={plans} />
        <PaymentSection />
        <ContactSection contactEmail={landing.contactEmail} />
      </main>
      <LandingFooter productName={landing.productName} />
    </div>
  );
}
