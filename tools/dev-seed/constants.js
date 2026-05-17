const DEV_TENANT = {
  id: '023772bb-391b-401c-936a-ed7034b69cec',
  slug: 'pho-viet',
  name: 'Nhà hàng Phở Việt',
};

const SUSPENDED_TENANT = {
  id: '0f5c8b74-3c4d-47db-9a07-3a8f30f1b5d1',
  slug: 'pho-viet-suspended',
  name: 'Nhà hàng Phở Việt Tạm Khóa',
  suspendedReason: 'SUBSCRIPTION_EXPIRED',
};

const PLATFORM_TENANT_ID = 'platform';

module.exports = {
  DEV_TENANT,
  SUSPENDED_TENANT,
  PLATFORM_TENANT_ID,
};
