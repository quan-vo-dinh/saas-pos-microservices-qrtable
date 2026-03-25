import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { SessionProvider } from '@/features/session/context/session-provider';
import { CartProvider } from '@/features/cart/context/cart-provider';
import { MobileShell } from '@/components/layout/mobile-shell';
import { LandingPage } from '@/pages/landing-page';
import { MenuPage } from '@/pages/menu-page';
import { OrderTrackingPage } from '@/pages/order-tracking-page';
import { RequestPaymentPage } from '@/pages/request-payment-page';

function App() {
  return (
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
  );
}

export default App;
