import { createHash } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { ValidateOrderableItemInput } from '@common/interfaces/tcp/catalog/menu-item-request.interface';

/**
 * Aggregate quantities for duplicate menuItemIds and return sorted entries.
 * Throws COMMON_VALIDATION_FAILED for any item with a total quantity < 1 or non-finite.
 */
export function normalizeStockItems(items: ValidateOrderableItemInput[]): ValidateOrderableItemInput[] {
  const totals = new Map<string, number>();
  for (const line of items) {
    totals.set(line.menuItemId, (totals.get(line.menuItemId) ?? 0) + line.quantity);
  }

  for (const [menuItemId, qty] of totals) {
    if (!Number.isFinite(qty) || qty < 1) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST, { menuItemId });
    }
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
}

/**
 * Compute a deterministic SHA-256 hash over sorted, aggregated menuItemId:quantity pairs.
 * Equivalent payloads produce the same hash regardless of input order.
 */
export function hashStockItems(items: ValidateOrderableItemInput[]): string {
  const normalized = normalizeStockItems(items);
  const payload = normalized.map(({ menuItemId, quantity }) => `${menuItemId}:${quantity}`).join('|');
  return createHash('sha256').update(payload).digest('hex');
}
