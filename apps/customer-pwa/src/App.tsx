import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MobileShell } from '@/components/layout/mobile-shell';
import { LandingPage } from '@/pages/landing-page';
import { MenuPage } from '@/pages/menu-page';
import { OrderTrackingPage } from '@/pages/order-tracking-page';
import { RequestPaymentPage } from '@/pages/request-payment-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MobileShell />}>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/order-tracking" element={<OrderTrackingPage />} />
          <Route path="/request-payment" element={<RequestPaymentPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
