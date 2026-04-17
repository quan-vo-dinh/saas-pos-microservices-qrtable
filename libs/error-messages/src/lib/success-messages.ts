export type SupportedLocale = 'vi' | 'en';

export enum SuccessCode {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  REORDERED = 'REORDERED',
  IMAGE_UPLOADED = 'IMAGE_UPLOADED',
  QR_REGENERATED = 'QR_REGENERATED',
  STATUS_UPDATED = 'STATUS_UPDATED',
}

const SUCCESS_MESSAGES: Record<SupportedLocale, Record<SuccessCode, string>> = {
  vi: {
    [SuccessCode.CREATED]: '{{entity}} đã được tạo thành công',
    [SuccessCode.UPDATED]: '{{entity}} đã được cập nhật thành công',
    [SuccessCode.DELETED]: '{{entity}} đã được xóa',
    [SuccessCode.REORDERED]: 'Đã sắp xếp lại {{entity}}',
    [SuccessCode.IMAGE_UPLOADED]: 'Ảnh đã được tải lên thành công',
    [SuccessCode.QR_REGENERATED]: 'Mã QR đã được tạo lại',
    [SuccessCode.STATUS_UPDATED]: 'Trạng thái đã được cập nhật',
  },
  en: {
    [SuccessCode.CREATED]: '{{entity}} created successfully',
    [SuccessCode.UPDATED]: '{{entity}} updated successfully',
    [SuccessCode.DELETED]: '{{entity}} deleted',
    [SuccessCode.REORDERED]: '{{entity}} reordered',
    [SuccessCode.IMAGE_UPLOADED]: 'Image uploaded successfully',
    [SuccessCode.QR_REGENERATED]: 'QR code regenerated',
    [SuccessCode.STATUS_UPDATED]: 'Status updated',
  },
};

export function getSuccessMessage(code: SuccessCode, entity?: string, locale: SupportedLocale = 'vi'): string {
  const template = SUCCESS_MESSAGES[locale]?.[code] ?? SUCCESS_MESSAGES['vi'][code];
  if (entity) {
    return template.replace('{{entity}}', entity);
  }
  return template;
}
