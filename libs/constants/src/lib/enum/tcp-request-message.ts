enum PRODUCT {
  CREATE = 'product.create',
  GET_BY_ID = 'product.get_by_id',
  GET_LIST = 'product.get_list',
  UPDATE = 'product.update',
  DELETE = 'product.delete',
}

enum USER {
  CREATE = 'user_access.create',
  GET_BY_ID = 'user_access.get_by_id',
  GET_LIST = 'user_access.get_list',
  UPDATE = 'user_access.update',
  DELETE = 'user_access.delete',
  GET_BY_USER_ID = 'user_access.get_by_user_id',
  UPSERT_WITH_TENANT = 'user.upsert_with_tenant',
  UPSERT_TENANT_OWNER_PROFILE = 'user.upsert_tenant_owner_profile',
  COUNT_BY_TENANT = 'user.count_by_tenant',
  FIND_OWNER_BY_TENANT = 'user.find_owner_by_tenant',
  DISABLE_TENANT_USERS = 'user.disable_tenant_users',
  DISABLE = 'user.disable',
}

enum KEYCLOAK {
  CREATE_USER = 'keycloak.create_user',
  CREATE_TENANT_OWNER = 'keycloak.create_tenant_owner',
  GET_USER_BY_ID = 'keycloak.get_user_by_id',
  GET_USERS = 'keycloak.get_users',
  UPDATE_USER = 'keycloak.update_user',
  DELETE_USER = 'keycloak.delete_user',
  ASSIGN_REALM_ROLE = 'keycloak.assign_realm_role',
  ASSIGN_REALM_ROLES = 'keycloak.assign_realm_roles',
  REMOVE_REALM_ROLE = 'keycloak.remove_realm_role',
  DISABLE_USER = 'keycloak.disable_user',
  GET_USER = 'keycloak.get_user',
  GET_USER_ADMIN = 'keycloak.get_user_admin',
}

enum AUTHORIZER {
  LOGIN = 'authorizer.login',
  VERIFY_USER_TOKEN = 'authorizer.verify_user_token',
}

enum CATEGORY {
  CREATE = 'category.create',
  GET_LIST = 'category.get_list',
  GET_BY_ID = 'category.get_by_id',
  UPDATE = 'category.update',
  DELETE = 'category.delete',
  REORDER = 'category.reorder',
}

enum MENU_ITEM {
  CREATE = 'menu_item.create',
  GET_LIST = 'menu_item.get_list',
  GET_BY_ID = 'menu_item.get_by_id',
  UPDATE = 'menu_item.update',
  SOFT_DELETE = 'menu_item.soft_delete',
  UPDATE_IMAGE = 'menu_item.update_image',
  CLEAR_IMAGE = 'menu_item.clear_image',
  /** Step 2.4 — validate item status/price/station at cart submit (Catalog-owned) */
  VALIDATE_ORDERABLE = 'menu_item.validate_orderable',
  /** Step 2.4 — pessimistic deduct in Catalog DB when staff confirms order */
  STOCK_DEDUCT_FOR_ORDER = 'menu_item.stock_deduct_for_order',
  /** Step 2.4 — restore stock on processing cancel when policy allows */
  STOCK_RELEASE_FOR_ORDER = 'menu_item.stock_release_for_order',
}

enum AREA {
  CREATE = 'area.create',
  GET_LIST = 'area.get_list',
  GET_BY_ID = 'area.get_by_id',
  UPDATE = 'area.update',
  DELETE = 'area.delete',
  REORDER = 'area.reorder',
}

enum TABLE {
  CREATE = 'table.create',
  GET_LIST = 'table.get_list',
  GET_BY_ID = 'table.get_by_id',
  UPDATE = 'table.update',
  DELETE = 'table.delete',
  UPDATE_STATUS = 'table.update_status',
  VALIDATE_QR_TOKEN = 'table.validate_qr_token',
  REGENERATE_QR_TOKEN = 'table.regenerate_qr_token',
}

enum MENU {
  GET_PUBLIC_MENU = 'menu.get_public_menu',
}

enum CATALOG {
  HEALTH = 'catalog.health',
  COUNT_TABLES = 'catalog.count_tables',
  COUNT_TABLES_BY_TENANT = 'catalog.count_tables_by_tenant',
  SEED_DEFAULT_AREA = 'catalog.seed_default_area',
}

enum SAAS {
  CREATE = 'saas.create',
  GET_BY_ID = 'saas.get_by_id',
  GET_BY_SLUG = 'saas.get_by_slug',
  GET_LIST = 'saas.get_list',
  UPDATE = 'saas.update',
  DELETE = 'saas.delete',
  HEALTH = 'saas.health',
}

enum TENANT {
  ONBOARD = 'tenant.onboard',
  LIST = 'tenant.list',
  GET_BY_ID = 'tenant.get_by_id',
  GET_BY_SLUG = 'tenant.get_by_slug',
  UPDATE = 'tenant.update',
  SUSPEND = 'tenant.suspend',
  ACTIVATE = 'tenant.activate',
  CLOSE = 'tenant.close',
  GET_USAGE = 'tenant.get_usage',
  GET_AUDIT = 'tenant.get_audit',
  GET_PLATFORM_STATS = 'tenant.get_platform_stats',
}

enum SUBSCRIPTION {
  ASSIGN = 'subscription.assign',
  CHECKOUT_INVOICE = 'subscription.checkout_invoice',
  CANCEL = 'subscription.cancel',
  GET_CURRENT = 'subscription.get_current',
  LIST_HISTORY = 'subscription.list_history',
  LIST_INVOICES = 'subscription.list_invoices',
  GET_INVOICE = 'subscription.get_invoice',
  CANCEL_INVOICE = 'subscription.cancel_invoice',
  MANUAL_CONFIRM_INVOICE = 'subscription.manual_confirm_invoice',
  HANDLE_WEBHOOK = 'subscription.handle_webhook',
}

enum PLAN {
  CREATE = 'plan.create',
  UPDATE = 'plan.update',
  DELETE = 'plan.delete',
  GET_BY_ID = 'plan.get_by_id',
  GET_BY_CODE = 'plan.get_by_code',
  LIST = 'plan.list',
  LIST_ACTIVE = 'plan.list_active',
}

enum ORDER {
  SESSION_JOIN = 'order.session_join',
  CART_GET = 'order.cart_get',
  CART_MUTATE = 'order.cart_mutate',
  CART_CLEAR = 'order.cart_clear',
  SUBMIT = 'order.submit',
  GET_LIST = 'order.get_list',
  GET_SESSION_LIST = 'order.get_session_list',
  GET_BY_ID = 'order.get_by_id',
  COUNT_TODAY_BY_TENANT = 'order.count_today_by_tenant',
  CONFIRM = 'order.confirm',
  CANCEL_PENDING = 'order.cancel_pending',
  CANCEL_PROCESSING = 'order.cancel_processing',
  CUSTOMER_CANCEL_PENDING = 'order.customer_cancel_pending',
  SERVICE_REQUEST_CREATE = 'order.service_request_create',
  SERVICE_REQUEST_GET_LIST = 'order.service_request_get_list',
  SERVICE_REQUEST_ACKNOWLEDGE = 'order.service_request_acknowledge',
  SERVICE_REQUEST_RESOLVE = 'order.service_request_resolve',
  BILL_GET_LIST = 'order.bill_get_list',
  BILL_GET_CURRENT = 'order.bill_get_current',
  BILL_REQUEST = 'order.bill_request',
  BILL_REOPEN = 'order.bill_reopen',
  TABLE_TRANSFER = 'order.table_transfer',
  RELEASE_EMPTY_TABLE_SESSION = 'order.release_empty_table_session',
  KDS_ACTIVE_ORDERS_GET = 'order.kds_active_orders_get',
  MARK_ITEMS_READY = 'order.mark_items_ready',
  REVERT_ITEMS_PROCESSING = 'order.revert_items_processing',
  MARK_SERVED = 'order.mark_served',
  BILL_GET_PAYMENT_SNAPSHOT = 'order.bill_get_payment_snapshot',
  BILL_MARK_PAID = 'order.bill_mark_paid',
}

enum PAYMENT {
  CREATE_VIETQR = 'payment.create_vietqr',
  CONFIRM_CASH = 'payment.confirm_cash',
  HANDLE_SEPAY_WEBHOOK = 'payment.handle_sepay_webhook',
  REFUND_REQUEST = 'payment.refund_request',
  REFUND_CONFIRM = 'payment.refund_confirm',
  GET_HISTORY = 'payment.get_history',
  GET_STATUS = 'payment.get_status',
}

enum PAYMENT_SETTINGS {
  GET = 'payment.settings_get',
  CREATE_EMPTY = 'payment.settings_create_empty',
  GENERATE_AUTHORIZE_URL = 'payment.settings_generate_authorize_url',
  HANDLE_OAUTH_CALLBACK = 'payment.settings_handle_oauth_callback',
  SELECT_BANK = 'payment.settings_select_bank',
  DISCONNECT = 'payment.settings_disconnect',
}

enum KITCHEN {
  GET_QUEUE = 'kitchen.get_queue',
  START_TICKET = 'kitchen.start_ticket',
  MARK_READY = 'kitchen.mark_ready',
  RECALL_TICKET = 'kitchen.recall_ticket',
  SET_PRIORITY = 'kitchen.set_priority',
  VOID_BY_ORDER = 'kitchen.void_by_order',
  PATCH_TABLE_SNAPSHOT = 'kitchen.patch_table_snapshot',
  REBUILD_TENANT = 'kitchen.rebuild_tenant',
}

export const TCP_REQUEST_MESSAGE = {
  PRODUCT,
  USER,
  KEYCLOAK,
  AUTHORIZER,
  CATEGORY,
  MENU_ITEM,
  AREA,
  TABLE,
  MENU,
  CATALOG,
  SAAS,
  TENANT,
  SUBSCRIPTION,
  PLAN,
  ORDER,
  KITCHEN,
  PAYMENT,
  PAYMENT_SETTINGS,
};
