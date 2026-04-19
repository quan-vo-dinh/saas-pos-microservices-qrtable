export enum ROLE {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  WAITER = 'WAITER',
  CHEF = 'CHEF',
  BARISTA = 'BARISTA',
}

export enum PERMISSION {
  /* SAAS */
  SAAS_CREATE = 'saas.create',
  SAAS_GET_BY_ID = 'saas.get_by_id',
  SAAS_GET_LIST = 'saas.get_list',
  SAAS_UPDATE = 'saas.update',
  SAAS_DELETE = 'saas.delete',

  /* CATALOG */
  CATALOG_CREATE = 'catalog.create',
  CATALOG_GET_BY_ID = 'catalog.get_by_id',
  CATALOG_GET_LIST = 'catalog.get_list',
  CATALOG_UPDATE = 'catalog.update',
  CATALOG_DELETE = 'catalog.delete',

  /* INVOICE */
  INVOICE_CREATE = 'invoice.create',
  INVOICE_GET_BY_ID = 'invoice.get_by_id',
  INVOICE_GET_ALL = 'invoice.get_all',
  INVOICE_UPDATE = 'invoice.update',
  INVOICE_DELETE = 'invoice.delete',
  INVOICE_SEND = 'invoice.send',

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

  /* ORDER (Phase 2A) */
  ORDER_CREATE = 'order.create',
  ORDER_CONFIRM = 'order.confirm',
  ORDER_CANCEL = 'order.cancel',
  ORDER_GET_LIST = 'order.get_list',
  ORDER_GET_BY_ID = 'order.get_by_id',

  /* KITCHEN (Phase 2B) */
  KITCHEN_GET_QUEUE = 'kitchen.get_queue',
  KITCHEN_UPDATE_TICKET = 'kitchen.update_ticket',
  KITCHEN_RECALL = 'kitchen.recall',

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
