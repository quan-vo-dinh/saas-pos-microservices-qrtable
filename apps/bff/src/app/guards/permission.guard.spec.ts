import { Reflector } from '@nestjs/core';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { PermissionGuard } from '@common/guards/permission.guard';
import { BusinessException } from '@common/error-messages/business.exception';

describe('PermissionGuard', () => {
  const getContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => 'handler',
    }) as any;

  const buildRequest = (userPermissions: PERMISSION[]) =>
    ({
      [MetadataKey.USER_DATA]: {
        metadata: { permissions: userPermissions },
      },
    }) as Record<string, unknown>;

  const buildGuard = (requiredPermissions: PERMISSION[] | undefined) =>
    new PermissionGuard({ get: jest.fn().mockReturnValue(requiredPermissions) } as unknown as Reflector);

  // Reference permission sets per role (must match role.json + EXPECTED_MATRIX in role.spec.ts)
  const SUPER_ADMIN_PERMS: PERMISSION[] = Object.values(PERMISSION);

  const OWNER_PERMS: PERMISSION[] = [
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
    PERMISSION.ORDER_CANCEL_PENDING,
    PERMISSION.ORDER_CANCEL_PROCESSING,
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
  ];

  const MANAGER_PERMS: PERMISSION[] = OWNER_PERMS.filter((p) => p !== PERMISSION.USER_DELETE);

  const WAITER_PERMS: PERMISSION[] = [
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.ORDER_CONFIRM,
    PERMISSION.ORDER_CANCEL_PENDING,
    PERMISSION.ORDER_GET_LIST,
    PERMISSION.ORDER_GET_BY_ID,
    PERMISSION.PAYMENT_CONFIRM_CASH,
    PERMISSION.PAYMENT_GET_HISTORY,
    PERMISSION.TABLE_TRANSFER,
    PERMISSION.TABLE_UPDATE_STATUS,
    PERMISSION.SERVICE_REQUEST_CREATE,
    PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE,
    PERMISSION.SERVICE_REQUEST_RESOLVE,
  ];

  const CHEF_PERMS: PERMISSION[] = [
    PERMISSION.CATALOG_GET_BY_ID,
    PERMISSION.CATALOG_GET_LIST,
    PERMISSION.KITCHEN_GET_QUEUE,
    PERMISSION.KITCHEN_UPDATE_TICKET,
    PERMISSION.KITCHEN_RECALL,
  ];

  const BARISTA_PERMS: PERMISSION[] = CHEF_PERMS;

  describe('Guard mechanics', () => {
    it('returns true when route has no required permissions', () => {
      const guard = buildGuard(undefined);
      expect(guard.canActivate(getContext({}))).toBe(true);
    });

    it('throws when user data is missing', () => {
      const guard = buildGuard([PERMISSION.CATALOG_GET_LIST]);
      expect(() => guard.canActivate(getContext({}))).toThrow(BusinessException);
    });

    it('throws when user lacks at least one required permission', () => {
      const guard = buildGuard([PERMISSION.CATALOG_GET_LIST, PERMISSION.CATALOG_CREATE]);
      const request = buildRequest([PERMISSION.CATALOG_GET_LIST]); // missing CATALOG_CREATE
      expect(() => guard.canActivate(getContext(request))).toThrow(BusinessException);
    });

    it('returns true when user has all required permissions (subset)', () => {
      const guard = buildGuard([PERMISSION.CATALOG_GET_LIST]);
      const request = buildRequest([PERMISSION.CATALOG_GET_LIST, PERMISSION.CATALOG_GET_BY_ID]);
      expect(guard.canActivate(getContext(request))).toBe(true);
    });
  });

  describe('Canonical matrix invariants', () => {
    type Scenario = {
      label: string;
      userPerms: PERMISSION[];
      requiredPerm: PERMISSION;
      shouldAllow: boolean;
    };

    const scenarios: Scenario[] = [
      // ==== Acceptance scenarios per Phase 2A Step 2.0 spec ====
      {
        label: 'WAITER allowed ORDER_CONFIRM (acceptance)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.ORDER_CONFIRM,
        shouldAllow: true,
      },
      {
        label: 'CHEF denied PAYMENT_CONFIRM_CASH (acceptance)',
        userPerms: CHEF_PERMS,
        requiredPerm: PERMISSION.PAYMENT_CONFIRM_CASH,
        shouldAllow: false,
      },

      // ==== WAITER coverage ====
      {
        label: 'WAITER denied ORDER_CREATE (only customer creates)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.ORDER_CREATE,
        shouldAllow: false,
      },
      {
        label: 'WAITER denied ORDER_CANCEL_PROCESSING (manager/owner only)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.ORDER_CANCEL_PROCESSING,
        shouldAllow: false,
      },
      {
        label: 'WAITER allowed ORDER_CANCEL_PENDING (reject pending POS)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.ORDER_CANCEL_PENDING,
        shouldAllow: true,
      },
      {
        label: 'WAITER denied KITCHEN_GET_QUEUE',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.KITCHEN_GET_QUEUE,
        shouldAllow: false,
      },
      {
        label: 'WAITER allowed PAYMENT_GET_HISTORY (Issue c — for "last bill" queries)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.PAYMENT_GET_HISTORY,
        shouldAllow: true,
      },
      {
        label: 'WAITER allowed TABLE_TRANSFER',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.TABLE_TRANSFER,
        shouldAllow: true,
      },
      {
        label: 'WAITER denied TABLE_DELETE (manager-only)',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.TABLE_DELETE,
        shouldAllow: false,
      },
      {
        label: 'WAITER allowed SERVICE_REQUEST_RESOLVE',
        userPerms: WAITER_PERMS,
        requiredPerm: PERMISSION.SERVICE_REQUEST_RESOLVE,
        shouldAllow: true,
      },

      // ==== CHEF coverage ====
      {
        label: 'CHEF allowed KITCHEN_GET_QUEUE',
        userPerms: CHEF_PERMS,
        requiredPerm: PERMISSION.KITCHEN_GET_QUEUE,
        shouldAllow: true,
      },
      {
        label: 'CHEF allowed KITCHEN_RECALL',
        userPerms: CHEF_PERMS,
        requiredPerm: PERMISSION.KITCHEN_RECALL,
        shouldAllow: true,
      },
      {
        label: 'CHEF denied ORDER_CONFIRM',
        userPerms: CHEF_PERMS,
        requiredPerm: PERMISSION.ORDER_CONFIRM,
        shouldAllow: false,
      },
      {
        label: 'CHEF denied SERVICE_REQUEST_CREATE',
        userPerms: CHEF_PERMS,
        requiredPerm: PERMISSION.SERVICE_REQUEST_CREATE,
        shouldAllow: false,
      },

      // ==== BARISTA coverage (mirror of CHEF) ====
      {
        label: 'BARISTA allowed KITCHEN_UPDATE_TICKET',
        userPerms: BARISTA_PERMS,
        requiredPerm: PERMISSION.KITCHEN_UPDATE_TICKET,
        shouldAllow: true,
      },
      {
        label: 'BARISTA denied PAYMENT_CONFIRM_CASH',
        userPerms: BARISTA_PERMS,
        requiredPerm: PERMISSION.PAYMENT_CONFIRM_CASH,
        shouldAllow: false,
      },

      // ==== MANAGER vs OWNER difference ====
      {
        label: 'MANAGER denied USER_DELETE (HR action — owner only)',
        userPerms: MANAGER_PERMS,
        requiredPerm: PERMISSION.USER_DELETE,
        shouldAllow: false,
      },
      {
        label: 'MANAGER allowed USER_UPDATE',
        userPerms: MANAGER_PERMS,
        requiredPerm: PERMISSION.USER_UPDATE,
        shouldAllow: true,
      },
      {
        label: 'MANAGER allowed ORDER_CANCEL_PROCESSING',
        userPerms: MANAGER_PERMS,
        requiredPerm: PERMISSION.ORDER_CANCEL_PROCESSING,
        shouldAllow: true,
      },
      {
        label: 'MANAGER allowed ORDER_CANCEL_PENDING',
        userPerms: MANAGER_PERMS,
        requiredPerm: PERMISSION.ORDER_CANCEL_PENDING,
        shouldAllow: true,
      },
      {
        label: 'OWNER allowed USER_DELETE',
        userPerms: OWNER_PERMS,
        requiredPerm: PERMISSION.USER_DELETE,
        shouldAllow: true,
      },
      {
        label: 'OWNER denied SAAS_CREATE (platform-only)',
        userPerms: OWNER_PERMS,
        requiredPerm: PERMISSION.SAAS_CREATE,
        shouldAllow: false,
      },
      {
        label: 'OWNER denied ROLE_CREATE (platform-only)',
        userPerms: OWNER_PERMS,
        requiredPerm: PERMISSION.ROLE_CREATE,
        shouldAllow: false,
      },

      // ==== SUPER_ADMIN — should access everything ====
      {
        label: 'SUPER_ADMIN allowed SAAS_CREATE',
        userPerms: SUPER_ADMIN_PERMS,
        requiredPerm: PERMISSION.SAAS_CREATE,
        shouldAllow: true,
      },
      {
        label: 'SUPER_ADMIN allowed PRODUCT_DELETE (legacy)',
        userPerms: SUPER_ADMIN_PERMS,
        requiredPerm: PERMISSION.PRODUCT_DELETE,
        shouldAllow: true,
      },
      {
        label: 'SUPER_ADMIN allowed ORDER_CONFIRM',
        userPerms: SUPER_ADMIN_PERMS,
        requiredPerm: PERMISSION.ORDER_CONFIRM,
        shouldAllow: true,
      },
    ];

    it.each(scenarios)('$label', ({ userPerms, requiredPerm, shouldAllow }) => {
      const guard = buildGuard([requiredPerm]);
      const request = buildRequest(userPerms);

      if (shouldAllow) {
        expect(guard.canActivate(getContext(request))).toBe(true);
      } else {
        expect(() => guard.canActivate(getContext(request))).toThrow(BusinessException);
      }
    });
  });
});
