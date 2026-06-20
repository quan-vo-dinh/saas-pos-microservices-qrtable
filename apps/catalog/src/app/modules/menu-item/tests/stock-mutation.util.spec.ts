import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { hashStockItems, normalizeStockItems } from '../utils/stock-mutation.util';

describe('normalizeStockItems', () => {
  it('aggregates duplicate item ids and returns deterministic sorted entries', () => {
    expect(
      normalizeStockItems([
        { menuItemId: 'b', quantity: 1 },
        { menuItemId: 'a', quantity: 2 },
        { menuItemId: 'b', quantity: 3 },
      ]),
    ).toEqual([
      { menuItemId: 'a', quantity: 2 },
      { menuItemId: 'b', quantity: 4 },
    ]);
  });

  it('returns single entry unchanged', () => {
    expect(normalizeStockItems([{ menuItemId: 'x', quantity: 5 }])).toEqual([{ menuItemId: 'x', quantity: 5 }]);
  });

  it('sorts multiple items by menuItemId', () => {
    const result = normalizeStockItems([
      { menuItemId: 'c', quantity: 1 },
      { menuItemId: 'a', quantity: 1 },
      { menuItemId: 'b', quantity: 1 },
    ]);
    expect(result.map((r) => r.menuItemId)).toEqual(['a', 'b', 'c']);
  });

  it('throws COMMON_VALIDATION_FAILED when total quantity is less than 1', () => {
    expect(() => normalizeStockItems([{ menuItemId: 'a', quantity: 0 }])).toThrow(BusinessException);
    expect(() => normalizeStockItems([{ menuItemId: 'a', quantity: -1 }])).toThrow(BusinessException);
  });

  it('throws COMMON_VALIDATION_FAILED when quantity is non-finite', () => {
    expect(() => normalizeStockItems([{ menuItemId: 'a', quantity: NaN }])).toThrow(BusinessException);
    expect(() => normalizeStockItems([{ menuItemId: 'a', quantity: Infinity }])).toThrow(BusinessException);
  });

  it('throws with COMMON_VALIDATION_FAILED error code', () => {
    try {
      normalizeStockItems([{ menuItemId: 'a', quantity: 0 }]);
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessException);
      expect((err as BusinessException).errorCode).toBe(ErrorCode.COMMON_VALIDATION_FAILED);
    }
  });
});

describe('hashStockItems', () => {
  it('hashes equivalent payloads identically regardless of input order', () => {
    const h1 = hashStockItems([
      { menuItemId: 'b', quantity: 1 },
      { menuItemId: 'a', quantity: 2 },
    ]);
    const h2 = hashStockItems([
      { menuItemId: 'a', quantity: 2 },
      { menuItemId: 'b', quantity: 1 },
    ]);
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different quantities', () => {
    const h1 = hashStockItems([{ menuItemId: 'a', quantity: 1 }]);
    const h2 = hashStockItems([{ menuItemId: 'a', quantity: 2 }]);
    expect(h1).not.toBe(h2);
  });

  it('produces different hashes for different item ids', () => {
    const h1 = hashStockItems([{ menuItemId: 'a', quantity: 1 }]);
    const h2 = hashStockItems([{ menuItemId: 'b', quantity: 1 }]);
    expect(h1).not.toBe(h2);
  });

  it('returns a 64-character hex string (sha256)', () => {
    const hash = hashStockItems([{ menuItemId: 'a', quantity: 1 }]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('aggregates duplicate menuItemIds before hashing', () => {
    const h1 = hashStockItems([
      { menuItemId: 'a', quantity: 1 },
      { menuItemId: 'a', quantity: 2 },
    ]);
    const h2 = hashStockItems([{ menuItemId: 'a', quantity: 3 }]);
    expect(h1).toBe(h2);
  });
});
