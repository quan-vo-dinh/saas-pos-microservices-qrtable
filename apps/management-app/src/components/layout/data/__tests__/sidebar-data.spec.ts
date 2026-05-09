import { sidebarData } from '../sidebar-data';
import { ROUTES } from '@/constants/routes';
import type { NavItem } from '@/components/layout/types';

function collectUrls(items: NavItem[]): string[] {
  return items.flatMap((item) => ('items' in item ? collectUrls(item.items) : [item.url]));
}

describe('sidebarData', () => {
  it('exposes one canonical POS settlement entry', () => {
    const urls = sidebarData.navGroups.flatMap((group) => collectUrls(group.items));

    expect(urls).toContain(ROUTES.POS_BILLS);
    expect(urls).not.toContain(ROUTES.POS_PAYMENT);
  });
});
