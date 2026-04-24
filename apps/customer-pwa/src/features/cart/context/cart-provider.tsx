import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { PublicMenuItem } from '@einvoice/types';

type CartItem = {
  menuItem: PublicMenuItem;
  quantity: number;
  note: string;
};

type CartState = {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  /** Optimistic-lock mock — đồng bộ với Step 2.2 PWA mock store */
  version: number;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: { menuItem: PublicMenuItem; quantity?: number; note?: string } }
  | { type: 'REMOVE_ITEM'; payload: { menuItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'UPDATE_NOTE'; payload: { menuItemId: string; note: string } }
  | { type: 'CLEAR' }
  | { type: 'BUMP_VERSION' };

function calculateTotals(items: CartItem[]): Pick<CartState, 'totalAmount' | 'totalItems'> {
  return {
    totalAmount: items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0),
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { menuItem, quantity = 1, note = '' } = action.payload;
      const existingIndex = state.items.findIndex((item) => item.menuItem.id === menuItem.id);

      let items: CartItem[];
      if (existingIndex >= 0) {
        items = state.items.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item,
        );
      } else {
        items = [...state.items, { menuItem, quantity, note }];
      }

      return { items, ...calculateTotals(items), version: state.version + 1 };
    }
    case 'REMOVE_ITEM': {
      const items = state.items.filter((item) => item.menuItem.id !== action.payload.menuItemId);
      return { items, ...calculateTotals(items), version: state.version + 1 };
    }
    case 'UPDATE_QUANTITY': {
      const { menuItemId, quantity } = action.payload;
      if (quantity <= 0) {
        const items = state.items.filter((item) => item.menuItem.id !== menuItemId);
        return { items, ...calculateTotals(items), version: state.version + 1 };
      }
      const items = state.items.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item,
      );
      return { items, ...calculateTotals(items), version: state.version + 1 };
    }
    case 'UPDATE_NOTE': {
      const items = state.items.map((item) =>
        item.menuItem.id === action.payload.menuItemId ? { ...item, note: action.payload.note } : item,
      );
      return { items, ...calculateTotals(items), version: state.version + 1 };
    }
    case 'CLEAR':
      return { ...INITIAL_STATE, version: state.version + 1 };
    case 'BUMP_VERSION':
      return { ...state, version: state.version + 1 };
    default:
      return state;
  }
}

const INITIAL_STATE: CartState = { items: [], totalAmount: 0, totalItems: 0, version: 1 };

type CartContextValue = CartState & {
  addItem: (menuItem: PublicMenuItem, quantity?: number, note?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNote: (menuItemId: string, note: string) => void;
  clear: () => void;
  bumpVersion: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, INITIAL_STATE);

  const value: CartContextValue = {
    ...state,
    addItem: (menuItem, quantity, note) =>
      dispatch({ type: 'ADD_ITEM', payload: { menuItem, quantity, note } }),
    removeItem: (menuItemId) => dispatch({ type: 'REMOVE_ITEM', payload: { menuItemId } }),
    updateQuantity: (menuItemId, quantity) =>
      dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } }),
    updateNote: (menuItemId, note) => dispatch({ type: 'UPDATE_NOTE', payload: { menuItemId, note } }),
    clear: () => dispatch({ type: 'CLEAR' }),
    bumpVersion: () => dispatch({ type: 'BUMP_VERSION' }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
