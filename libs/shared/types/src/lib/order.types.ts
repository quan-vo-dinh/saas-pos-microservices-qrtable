export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'momo' | 'zalopay' | 'bank_transfer';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export type OrderItem = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
  status: OrderStatus;
};

export type Order = {
  id: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};
