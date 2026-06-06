import type { SupportedLocale } from './success-messages';

export type EntityKey = 'category' | 'area' | 'table' | 'menuItem' | 'tenant' | 'user';

const ENTITY_NAMES: Record<SupportedLocale, Record<EntityKey, string>> = {
  vi: {
    category: 'Danh mục',
    area: 'Khu vực',
    table: 'Bàn',
    menuItem: 'Món ăn',
    tenant: 'Cửa hàng',
    user: 'Tài khoản',
  },
  en: {
    category: 'Category',
    area: 'Area',
    table: 'Table',
    menuItem: 'Menu item',
    tenant: 'Tenant',
    user: 'User',
  },
};

export function getEntityName(key: EntityKey, locale: SupportedLocale = 'vi'): string {
  return ENTITY_NAMES[locale]?.[key] ?? ENTITY_NAMES['vi'][key];
}
