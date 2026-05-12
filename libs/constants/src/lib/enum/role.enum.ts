export enum ROLE {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  WAITER = 'WAITER',
  CHEF = 'CHEF',
  BARISTA = 'BARISTA',
}

export enum PERMISSION {
  /* SAAS — legacy, remove after Phase 5 */
  /** @deprecated Use TENANT_ONBOARD. */
  SAAS_CREATE = 'saas.create',
  /** @deprecated Use TENANT_READ_ANY. */
  SAAS_GET_BY_ID = 'saas.get_by_id',
  /** @deprecated Use TENANT_LIST_ALL. */
  SAAS_GET_LIST = 'saas.get_list',
  /** @deprecated Use TENANT_UPDATE. */
  SAAS_UPDATE = 'saas.update',
  /** @deprecated Use TENANT_CLOSE. */
  SAAS_DELETE = 'saas.delete',

  /* TENANT (Phase 4B) */
  TENANT_ONBOARD = 'tenant.onboard',
  TENANT_LIST_ALL = 'tenant.list_all',
  TENANT_READ_ANY = 'tenant.read_any',
  TENANT_READ_OWN = 'tenant.read_own',
  TENANT_UPDATE = 'tenant.update',
  TENANT_SUSPEND = 'tenant.suspend',
  TENANT_ACTIVATE = 'tenant.activate',
  TENANT_CLOSE = 'tenant.close',

  /* SUBSCRIPTION (Phase 4B) */
  SUBSCRIPTION_ASSIGN = 'subscription.assign',
  SUBSCRIPTION_LIST_ANY = 'subscription.list_any',
  SUBSCRIPTION_LIST_HISTORY_ANY = 'subscription.list_history_any',
  SUBSCRIPTION_READ_OWN = 'subscription.read_own',
  SUBSCRIPTION_CHECKOUT = 'subscription.checkout',

  /* PLAN (Phase 4B) */
  PLAN_CREATE = 'plan.create',
  PLAN_READ = 'plan.read',
  PLAN_UPDATE = 'plan.update',
  PLAN_DELETE = 'plan.delete',

  /* PAYMENT SETTINGS (Phase 4B) */
  PAYMENT_SETTINGS_READ_OWN = 'payment_settings.read_own',
  PAYMENT_SETTINGS_UPDATE_OWN = 'payment_settings.update_own',

  /* CATALOG */
  CATALOG_CREATE = 'catalog.create',
  CATALOG_GET_BY_ID = 'catalog.get_by_id',
  CATALOG_GET_LIST = 'catalog.get_list',
  CATALOG_UPDATE = 'catalog.update',
  CATALOG_DELETE = 'catalog.delete',

  /* USER */
  USER_CREATE = 'user.create',
  USER_GET_BY_ID = 'user.get_by_id',
  USER_GET_ALL = 'user.get_all',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',

  /* ROLE */
  ROLE_CREATE = 'role.create',
  ROLE_GET_BY_ID = 'role.get_by_id',
  ROLE_GET_ALL = 'role.get_all',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',

  /* PRODUCT (legacy template — kept for SUPER_ADMIN backward compat) */
  PRODUCT_CREATE = 'product.create',
  PRODUCT_GET_BY_ID = 'product.get_by_id',
  PRODUCT_GET_ALL = 'product.get_all',
  PRODUCT_UPDATE = 'product.update',
  PRODUCT_DELETE = 'product.delete',

  /* ORDER (Phase 2A) — cancel split Step 2.4 (Q7-C) */
  ORDER_CREATE = 'order.create',
  ORDER_CONFIRM = 'order.confirm',
  /** Reject/cancel đơn `PENDING` — OWNER, MANAGER, WAITER */
  ORDER_CANCEL_PENDING = 'order.cancel_pending',
  /** Cancel đơn đã confirm (`PROCESSING`+) + lý do — OWNER, MANAGER */
  ORDER_CANCEL_PROCESSING = 'order.cancel_processing',
  ORDER_GET_LIST = 'order.get_list',
  ORDER_GET_BY_ID = 'order.get_by_id',

  /* KITCHEN (Phase 2B) */
  KITCHEN_GET_QUEUE = 'kitchen.get_queue',
  KITCHEN_UPDATE_TICKET = 'kitchen.update_ticket',
  KITCHEN_RECALL = 'kitchen.recall',
  KITCHEN_SET_PRIORITY = 'kitchen.set_priority',

  /* PAYMENT (Phase 3) */
  PAYMENT_CREATE = 'payment.create',
  PAYMENT_CONFIRM_CASH = 'payment.confirm_cash',
  PAYMENT_REFUND = 'payment.refund',
  PAYMENT_GET_HISTORY = 'payment.get_history',

  /* TABLE (Phase 1-2A) */
  TABLE_CREATE = 'table.create',
  TABLE_UPDATE = 'table.update',
  TABLE_DELETE = 'table.delete',
  TABLE_TRANSFER = 'table.transfer',
  TABLE_UPDATE_STATUS = 'table.update_status',

  /* SERVICE_REQUEST (Phase 2A) */
  SERVICE_REQUEST_CREATE = 'service_request.create',
  SERVICE_REQUEST_ACKNOWLEDGE = 'service_request.acknowledge',
  SERVICE_REQUEST_RESOLVE = 'service_request.resolve',
}
