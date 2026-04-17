import { ErrorCode } from './error-code.enum';
import { ERROR_MESSAGES_VI } from './error-messages.vi';
import { ERROR_MESSAGES_EN } from './error-messages.en';
import type { SupportedLocale } from './success-messages';

const DEFAULT_LOCALE: SupportedLocale = 'vi';

const MESSAGES: Record<SupportedLocale, Record<ErrorCode, string>> = {
  vi: ERROR_MESSAGES_VI,
  en: ERROR_MESSAGES_EN,
};

export function getErrorMessage(
  code: ErrorCode,
  locale: SupportedLocale = DEFAULT_LOCALE,
  params?: Record<string, string>,
): string {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  let message = messages[code] ?? MESSAGES[DEFAULT_LOCALE][code] ?? code;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }
  return message;
}
