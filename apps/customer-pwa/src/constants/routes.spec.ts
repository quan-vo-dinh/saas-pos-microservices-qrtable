import { ROUTES } from './routes';

describe('ROUTES', () => {
  it('builds order tracking detail path from real order id', () => {
    expect(ROUTES.ORDER_TRACKING_DETAIL('order-123')).toBe('/order-tracking/order-123');
  });

  it('exposes route pattern for order tracking detail', () => {
    expect(ROUTES.ORDER_TRACKING_WITH_ID).toBe('/order-tracking/:orderId');
  });
});
