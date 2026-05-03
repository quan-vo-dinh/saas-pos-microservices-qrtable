const ENTITY_NAMES: Record<string, string> = {
  category: 'Danh mục',
  area: 'Khu vực',
  table: 'Bàn',
  menuItem: 'Món ăn',
  product: 'Sản phẩm',
  tenant: 'Cửa hàng',
  user: 'Tài khoản',
};

const SUCCESS_TEMPLATES: Record<string, string> = {
  created: '{{entity}} đã được tạo thành công',
  updated: '{{entity}} đã được cập nhật thành công',
  deleted: '{{entity}} đã được xóa',
  reordered: 'Đã sắp xếp lại {{entity}}',
  imageUploaded: 'Ảnh đã được tải lên thành công',
  imageRemoved: 'Đã gỡ ảnh món',
  qrRegenerated: 'Mã QR đã được tạo lại',
  statusUpdated: 'Trạng thái đã được cập nhật',
};

export function successMessage(templateKey: keyof typeof SUCCESS_TEMPLATES, entityKey?: string): string {
  const template = SUCCESS_TEMPLATES[templateKey];
  if (entityKey && ENTITY_NAMES[entityKey]) {
    return template.replace('{{entity}}', ENTITY_NAMES[entityKey]);
  }
  return template;
}

export function getErrorDisplayMessage(error: Error): string {
  const err = error as Error & Record<string, unknown>;
  console.log('error:', error);
  if ('serverMessage' in err && typeof err['serverMessage'] === 'string') {
    return err['serverMessage'];
  }
  return error.message;
}
