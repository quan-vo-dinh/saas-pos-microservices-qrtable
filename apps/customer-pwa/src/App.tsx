import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ROUTES } from '@/constants/routes';
import { ErrorBoundary } from '@/components/error-boundary';
import { MobileShell } from '@/components/layout/mobile-shell';
import { SessionProvider } from '@/features/session/context/session-provider';
import { LandingPage } from '@/pages/landing-page';
import { MenuPage } from '@/pages/menu-page';
import { OrderTrackingPage } from '@/pages/order-tracking-page';
import { RequestPaymentPage } from '@/pages/request-payment-page';

/** Root `/` must forward QR deep-link query params to `/landing` (table URL from management app). */
function RedirectRootToLanding(): ReactElement {
  const { search } = useLocation();
  return <Navigate to={{ pathname: ROUTES.LANDING, search }} replace />;
}

function App(): ReactElement {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MobileShell />}>
              <Route path="/" element={<RedirectRootToLanding />} />
              <Route path={ROUTES.LANDING} element={<LandingPage />} />
              <Route path={ROUTES.MENU} element={<MenuPage />} />
              <Route path={ROUTES.ORDER_TRACKING} element={<OrderTrackingPage />} />
              <Route path={ROUTES.ORDER_TRACKING_WITH_ID} element={<OrderTrackingPage />} />
              <Route path={ROUTES.REQUEST_PAYMENT} element={<RequestPaymentPage />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}

export default App;
