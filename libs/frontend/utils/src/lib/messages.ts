const ENTITY_PLACEHOLDER = '{{entity}}';
const DEFAULT_ENTITY_NAME = 'Đối tượng';

export const ENTITY_NAMES = {
  category: 'Danh mục',
  area: 'Khu vực',
  table: 'Bàn',
  menuItem: 'Món ăn',
  product: 'Sản phẩm',
  tenant: 'Cửa hàng',
  user: 'Tài khoản',
  order: 'Đơn hàng',
  bill: 'Hóa đơn',
  serviceRequest: 'Yêu cầu phục vụ',
} as const;

export const SUCCESS_TEMPLATES = {
  created: `${ENTITY_PLACEHOLDER} đã được tạo thành công`,
  updated: `${ENTITY_PLACEHOLDER} đã được cập nhật thành công`,
  deleted: `${ENTITY_PLACEHOLDER} đã được xóa`,
  reordered: `Đã sắp xếp lại ${ENTITY_PLACEHOLDER}`,
  imageUploaded: 'Ảnh đã được tải lên thành công',
  imageRemoved: 'Đã gỡ ảnh món',
  qrRegenerated: 'Mã QR đã được tạo lại',
  statusUpdated: 'Trạng thái đã được cập nhật',
} as const;

export type EntityKey = keyof typeof ENTITY_NAMES;
export type SuccessTemplateKey = keyof typeof SUCCESS_TEMPLATES;

function resolveEntityName(entityKey?: EntityKey): string {
  if (!entityKey) {
    return DEFAULT_ENTITY_NAME;
  }

  return (ENTITY_NAMES as Record<string, string>)[entityKey] ?? DEFAULT_ENTITY_NAME;
}

export function successMessage(templateKey: SuccessTemplateKey, entityKey?: EntityKey): string {
  const template = SUCCESS_TEMPLATES[templateKey];

  if (!template.includes(ENTITY_PLACEHOLDER)) {
    return template;
  }

  return template.replace(ENTITY_PLACEHOLDER, resolveEntityName(entityKey));
}

export function getErrorDisplayMessage(error: Error): string {
  const err = error as Error & Record<string, unknown>;
  if ('serverMessage' in err && typeof err['serverMessage'] === 'string') {
    return err['serverMessage'];
  }
  return error.message;
}
