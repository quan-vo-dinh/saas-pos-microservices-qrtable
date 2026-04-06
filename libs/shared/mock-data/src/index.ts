// Raw data
export { categories } from './lib/categories';
export { menuItems } from './lib/menu-items';
export { areas } from './lib/areas';
export { tables } from './lib/tables';
export { orders } from './lib/orders';
export { sessions, type MockSession } from './lib/sessions';

// Helper functions
export {
  getMenuByCategory,
  getAllMenuItems,
  getTableByQrToken,
  getSessionByQrToken,
  getOrdersBySession,
  getMockSession,
  type CategoryWithItems,
} from './lib/helpers';
