import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ROUTES } from '@/constants/routes';
import { ErrorBoundary } from '@/components/error-boundary';
import { MobileShell } from '@/components/layout/mobile-shell';
import { SessionProvider } from '@/features/session/context/session-provider';
import { CartProvider } from '@/features/cart/context/cart-provider';
import { LandingPage } from '@/pages/landing-page';
import { MenuPage } from '@/pages/menu-page';
import { OrderTrackingPage } from '@/pages/order-tracking-page';
import { RequestPaymentPage } from '@/pages/request-payment-page';

function App(): ReactElement {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<MobileShell />}>
                <Route path="/" element={<Navigate to={ROUTES.LANDING} replace />} />
                <Route path={ROUTES.LANDING} element={<LandingPage />} />
                <Route path={ROUTES.MENU} element={<MenuPage />} />
                <Route path={ROUTES.ORDER_TRACKING} element={<OrderTrackingPage />} />
                <Route path={ROUTES.REQUEST_PAYMENT} element={<RequestPaymentPage />} />
              </Route>
              <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SessionProvider>
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}

export default App;
