import type { CartSnapshot, PublicMenuItem } from '@einvoice/types';
import { optimisticPatch } from './cart-optimistic';

const menuItem: PublicMenuItem = {
  id: 'menu-1',
  name: 'Phở bò',
  description: null,
  price: 65000,
  imageUrl: 'https://cdn.example.test/pho.jpg',
  status: 'available',
};

function makeCart(overrides: Partial<CartSnapshot> = {}): CartSnapshot {
  return {
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    cartVersion: 1,
    status: 'ACTIVE',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items: [
      {
        cartLineId: 'line-1',
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: 1,
        unitPrice: menuItem.price,
        note: 'Không cay',
        lineVersion: 1,
      },
    ],
    ...overrides,
  };
}

describe('optimisticPatch', () => {
  it('merges ADD_ITEM into a matching menu item and normalized note', () => {
    const next = optimisticPatch(makeCart(), {
      operation: 'ADD_ITEM',
      menuItemId: menuItem.id,
      menuItem,
      quantity: 2,
      note: '  Không cay  ',
    });

    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ quantity: 3, note: 'Không cay', lineVersion: 2 });
  });

  it('creates a separate line when ADD_ITEM has a different note', () => {
    const next = optimisticPatch(makeCart(), {
      operation: 'ADD_ITEM',
      menuItemId: menuItem.id,
      menuItem,
      note: 'Ít hành',
    });

    expect(next.items).toHaveLength(2);
    expect(next.items[1]).toMatchObject({ note: 'Ít hành', menuItemImageUrl: menuItem.imageUrl });
  });

  it('removes a line when SET_QUANTITY is zero', () => {
    expect(optimisticPatch(makeCart(), { operation: 'SET_QUANTITY', cartLineId: 'line-1', quantity: 0 }).items).toEqual(
      [],
    );
  });

  it('trims and caps UPDATE_NOTE at 255 characters', () => {
    const next = optimisticPatch(makeCart(), {
      operation: 'UPDATE_NOTE',
      cartLineId: 'line-1',
      note: `  ${'a'.repeat(256)}  `,
    });

    expect(next.items[0]).toMatchObject({ note: 'a'.repeat(255), lineVersion: 2 });
  });

  it('removes only the requested line and clears all lines', () => {
    const cart = makeCart({
      items: [...makeCart().items, { ...makeCart().items[0], cartLineId: 'line-2', menuItemId: 'menu-2' }],
    });

    expect(optimisticPatch(cart, { operation: 'REMOVE_LINE', cartLineId: 'line-1' }).items).toEqual([
      expect.objectContaining({ cartLineId: 'line-2' }),
    ]);
    expect(optimisticPatch(cart, { operation: 'CLEAR' }).items).toEqual([]);
  });
});
