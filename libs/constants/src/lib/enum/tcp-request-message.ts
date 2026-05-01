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
}

enum KEYCLOAK {
  CREATE_USER = 'keycloak.create_user',
  GET_USER_BY_ID = 'keycloak.get_user_by_id',
  GET_USERS = 'keycloak.get_users',
  UPDATE_USER = 'keycloak.update_user',
  DELETE_USER = 'keycloak.delete_user',
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

enum ORDER {
  SESSION_JOIN = 'order.session_join',
  CART_GET = 'order.cart_get',
  CART_MUTATE = 'order.cart_mutate',
  CART_CLEAR = 'order.cart_clear',
  SUBMIT = 'order.submit',
  GET_LIST = 'order.get_list',
  GET_BY_ID = 'order.get_by_id',
  CONFIRM = 'order.confirm',
  CANCEL_PENDING = 'order.cancel_pending',
  CANCEL_PROCESSING = 'order.cancel_processing',
  CUSTOMER_CANCEL_PENDING = 'order.customer_cancel_pending',
  SERVICE_REQUEST_CREATE = 'order.service_request_create',
  SERVICE_REQUEST_GET_LIST = 'order.service_request_get_list',
  SERVICE_REQUEST_ACKNOWLEDGE = 'order.service_request_acknowledge',
  SERVICE_REQUEST_RESOLVE = 'order.service_request_resolve',
  BILL_GET_CURRENT = 'order.bill_get_current',
  BILL_REQUEST = 'order.bill_request',
  BILL_REOPEN = 'order.bill_reopen',
  TABLE_TRANSFER = 'order.table_transfer',
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
  ORDER,
};
