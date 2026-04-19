// Raw data
export { categories } from './lib/categories';
export { menuItems } from './lib/menu-items';
export { areas } from './lib/areas';
export { tables } from './lib/tables';
export { orders } from './lib/orders';
export { sessions, type MockSessionExtended } from './lib/sessions';
export { bills } from './lib/bills';
export { carts, type MockCart } from './lib/carts';
export { serviceRequests } from './lib/service-requests';

// Helper functions
export {
  getMenuByCategory,
  getAllMenuItems,
  getTableByQrToken,
  getSessionByQrToken,
  getOrdersBySession,
  getMockSession,
  getBillBySession,
  getCartBySession,
  getActiveServiceRequests,
  getMockSessionById,
  type CategoryWithItems,
} from './lib/helpers';
