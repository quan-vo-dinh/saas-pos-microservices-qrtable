import roleSeed from './role.json';
import { PERMISSION } from '@common/constants/enum/role.enum';

const ALL_PERMISSIONS_VALUES = new Set<string>(Object.values(PERMISSION));

const EXPECTED_MATRIX: Record<string, Set<string>> = {
  SUPER_ADMIN: new Set<string>(Array.from(ALL_PERMISSIONS_VALUES)),
  OWNER: new Set<string>([
    PERMISSION.CATALOG_CREATE,
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.CATALOG_UPDATE,
    PERMISSION.CATALOG_DELETE,
    PERMISSION.USER_CREATE,
    PERMISSION.USER_GET_BY_ID,
    PERMISSION.USER_GET_ALL,
    PERMISSION.USER_UPDATE,
    PERMISSION.USER_DELETE,
    PERMISSION.ORDER_CREATE,
    PERMISSION.ORDER_CONFIRM,
    PERMISSION.ORDER_CANCEL,
    PERMISSION.ORDER_GET_LIST,
    PERMISSION.ORDER_GET_BY_ID,
    PERMISSION.KITCHEN_GET_QUEUE,
    PERMISSION.KITCHEN_UPDATE_TICKET,
    PERMISSION.KITCHEN_RECALL,
    PERMISSION.PAYMENT_CREATE,
    PERMISSION.PAYMENT_CONFIRM_CASH,
    PERMISSION.PAYMENT_REFUND,
    PERMISSION.PAYMENT_GET_HISTORY,
    PERMISSION.TABLE_CREATE,
    PERMISSION.TABLE_UPDATE,
    PERMISSION.TABLE_DELETE,
    PERMISSION.TABLE_TRANSFER,
    PERMISSION.TABLE_UPDATE_STATUS,
    PERMISSION.SERVICE_REQUEST_CREATE,
    PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE,
    PERMISSION.SERVICE_REQUEST_RESOLVE,
  ]),
  MANAGER: new Set<string>([
    PERMISSION.CATALOG_CREATE,
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.CATALOG_UPDATE,
    PERMISSION.CATALOG_DELETE,
    PERMISSION.USER_CREATE,
    PERMISSION.USER_GET_BY_ID,
    PERMISSION.USER_GET_ALL,
    PERMISSION.USER_UPDATE,
    // NOTE: USER_DELETE intentionally excluded — Manager is operational, not HR
    PERMISSION.ORDER_CREATE,
    PERMISSION.ORDER_CONFIRM,
    PERMISSION.ORDER_CANCEL,
    PERMISSION.ORDER_GET_LIST,
    PERMISSION.ORDER_GET_BY_ID,
    PERMISSION.KITCHEN_GET_QUEUE,
    PERMISSION.KITCHEN_UPDATE_TICKET,
    PERMISSION.KITCHEN_RECALL,
    PERMISSION.PAYMENT_CREATE,
    PERMISSION.PAYMENT_CONFIRM_CASH,
    PERMISSION.PAYMENT_REFUND,
    PERMISSION.PAYMENT_GET_HISTORY,
    PERMISSION.TABLE_CREATE,
    PERMISSION.TABLE_UPDATE,
    PERMISSION.TABLE_DELETE,
    PERMISSION.TABLE_TRANSFER,
    PERMISSION.TABLE_UPDATE_STATUS,
    PERMISSION.SERVICE_REQUEST_CREATE,
    PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE,
    PERMISSION.SERVICE_REQUEST_RESOLVE,
  ]),
  WAITER: new Set<string>([
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.ORDER_CONFIRM,
    PERMISSION.ORDER_GET_LIST,
    PERMISSION.ORDER_GET_BY_ID,
    PERMISSION.PAYMENT_CONFIRM_CASH,
    PERMISSION.PAYMENT_GET_HISTORY,
    PERMISSION.TABLE_TRANSFER,
    PERMISSION.TABLE_UPDATE_STATUS,
    PERMISSION.SERVICE_REQUEST_CREATE,
    PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE,
    PERMISSION.SERVICE_REQUEST_RESOLVE,
  ]),
  CHEF: new Set<string>([
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.KITCHEN_GET_QUEUE,
    PERMISSION.KITCHEN_UPDATE_TICKET,
    PERMISSION.KITCHEN_RECALL,
  ]),
  BARISTA: new Set<string>([
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.KITCHEN_GET_QUEUE,
    PERMISSION.KITCHEN_UPDATE_TICKET,
    PERMISSION.KITCHEN_RECALL,
  ]),
};

const EXPECTED_ROLE_NAMES = ['BARISTA', 'CHEF', 'MANAGER', 'OWNER', 'SUPER_ADMIN', 'WAITER'];

describe('role.json — canonical permission matrix', () => {
  it('contains exactly 6 roles with expected names', () => {
    expect(roleSeed.data).toHaveLength(6);
    const actualNames = roleSeed.data.map((r) => r.name).sort();
    expect(actualNames).toEqual(EXPECTED_ROLE_NAMES);
  });

  it.each(Object.keys(EXPECTED_MATRIX))('role %s has exact expected permissions', (roleName) => {
    const role = roleSeed.data.find((r) => r.name === roleName);
    expect(role).toBeDefined();
    const actualPerms = new Set<string>(role!.permissions);
    const expectedPerms = EXPECTED_MATRIX[roleName];

    // Check both directions for clearer error messages on drift
    const missing = Array.from(expectedPerms).filter((p) => !actualPerms.has(p));
    const extra = Array.from(actualPerms).filter((p) => !expectedPerms.has(p));

    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
    expect(actualPerms.size).toBe(expectedPerms.size);
  });

  it('every permission value in role.json exists in PERMISSION enum', () => {
    const invalidPerms: { role: string; permission: string }[] = [];
    roleSeed.data.forEach((role) => {
      role.permissions.forEach((p) => {
        if (!ALL_PERMISSIONS_VALUES.has(p)) {
          invalidPerms.push({ role: role.name, permission: p });
        }
      });
    });
    expect(invalidPerms).toEqual([]);
  });

  it('SUPER_ADMIN has ALL 51 permissions from PERMISSION enum', () => {
    const role = roleSeed.data.find((r) => r.name === 'SUPER_ADMIN')!;
    expect(role.permissions).toHaveLength(45);
    expect(new Set(role.permissions)).toEqual(ALL_PERMISSIONS_VALUES);
  });

  it('role _id values are stable (matches expected hex IDs)', () => {
    const expectedIds: Record<string, string> = {
      SUPER_ADMIN: '68a3f2f1b3e811435a8ad004',
      OWNER: '68a3f2f1b3e811435a8ad005',
      MANAGER: '68a3f2f1b3e811435a8ad006',
      WAITER: '68a3f2f1b3e811435a8ad007',
      CHEF: '68a3f2f1b3e811435a8ad008',
      BARISTA: '68a3f2f1b3e811435a8ad009',
    };
    roleSeed.data.forEach((role) => {
      expect((role._id as { $oid: string }).$oid).toBe(expectedIds[role.name]);
    });
  });
});
