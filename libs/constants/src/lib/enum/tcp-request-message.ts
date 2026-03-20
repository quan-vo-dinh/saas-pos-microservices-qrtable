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

enum CATALOG {
  CREATE = 'catalog.create',
  GET_BY_ID = 'catalog.get_by_id',
  GET_LIST = 'catalog.get_list',
  UPDATE = 'catalog.update',
  DELETE = 'catalog.delete',
  HEALTH = 'catalog.health',
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
  CATALOG,
  SAAS,
};
