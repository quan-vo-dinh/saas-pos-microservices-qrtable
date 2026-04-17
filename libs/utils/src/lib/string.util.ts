import { v4 } from 'uuid';
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';

export const getProcessId = (prefix?: string) => {
  return prefix ? `${prefix}-${v4()}` : v4();
};

export function parseToken(token: string): string {
  if (!token?.trim()) {
    throw new BusinessException(ErrorCode.AUTH_TOKEN_NOT_PROVIDED, HttpStatus.UNAUTHORIZED);
  }

  if (token.includes(' ')) {
    return token.split(' ')[1];
  }
  return token;
}
