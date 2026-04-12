enum INVOICE {
  CREATE = 'invoice.create',
  GET_BY_ID = 'invoice.get_by_id',
  GET_LIST = 'invoice.get_list',
  UPDATE = 'invoice.update',
  DELETE = 'invoice.delete',
}

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

enum SAAS {
  CREATE = 'saas.create',
  GET_BY_ID = 'saas.get_by_id',
  GET_LIST = 'saas.get_list',
  UPDATE = 'saas.update',
  DELETE = 'saas.delete',
  HEALTH = 'saas.health',
}

export const TCP_REQUEST_MESSAGE = {
  INVOICE,
  PRODUCT,
  USER,
  KEYCLOAK,
  AUTHORIZER,
  CATEGORY,
  MENU_ITEM,
  AREA,
  TABLE,
  MENU,
  SAAS,
};
