import type { CartSnapshot, PublicMenuItem } from '@einvoice/types';
import type { CartMutateOperation } from '../services/order.service';

export type PatchVars = {
  operation: CartMutateOperation;
  menuItemId?: string;
  cartLineId?: string;
  quantity?: number;
  note?: string;
  menuItem?: PublicMenuItem;
};

function normalizeCartNote(note?: string): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed.slice(0, 255) : undefined;
}

export function optimisticPatch(prev: CartSnapshot, vars: PatchVars): CartSnapshot {
  const items = [...prev.items];
  const now = new Date().toISOString();

  switch (vars.operation) {
    case 'ADD_ITEM': {
      const menuItem = vars.menuItem;
      const quantity = vars.quantity ?? 1;
      if (!menuItem || !vars.menuItemId) return prev;
      const note = normalizeCartNote(vars.note);
      const index = items.findIndex((line) => line.menuItemId === menuItem.id && normalizeCartNote(line.note) === note);
      if (index >= 0) {
        const line = items[index];
        items[index] = {
          ...line,
          menuItemName: menuItem.name,
          menuItemImageUrl: menuItem.imageUrl ?? null,
          quantity: line.quantity + quantity,
          unitPrice: menuItem.price,
          note,
          lineVersion: line.lineVersion + 1,
        };
      } else {
        items.push({
          cartLineId: `optimistic-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          menuItemImageUrl: menuItem.imageUrl ?? null,
          quantity,
          unitPrice: menuItem.price,
          note,
          lineVersion: 1,
        });
      }
      break;
    }
    case 'SET_QUANTITY': {
      if (!vars.cartLineId || vars.quantity === undefined) return prev;
      const index = items.findIndex((line) => line.cartLineId === vars.cartLineId);
      if (index < 0) return prev;
      if (vars.quantity <= 0) {
        items.splice(index, 1);
      } else {
        const line = items[index];
        items[index] = { ...line, quantity: vars.quantity, lineVersion: line.lineVersion + 1 };
      }
      break;
    }
    case 'UPDATE_NOTE': {
      if (!vars.cartLineId) return prev;
      const index = items.findIndex((line) => line.cartLineId === vars.cartLineId);
      if (index < 0) return prev;
      const line = items[index];
      items[index] = { ...line, note: normalizeCartNote(vars.note), lineVersion: line.lineVersion + 1 };
      break;
    }
    case 'REMOVE_LINE':
      if (!vars.cartLineId) return prev;
      return { ...prev, items: items.filter((line) => line.cartLineId !== vars.cartLineId), updatedAt: now };
    case 'CLEAR':
      return { ...prev, items: [], updatedAt: now };
    default:
      return prev;
  }

  return { ...prev, items, updatedAt: now };
}
