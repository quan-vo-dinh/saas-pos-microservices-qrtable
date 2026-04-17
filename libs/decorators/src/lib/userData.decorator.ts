import { MetadataKey } from '@common/constants/common.constant';
import { createParamDecorator, ExecutionContext, HttpStatus } from '@nestjs/common';
import { AuthorizedMetadata, AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';

export const UserData = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthorizedMetadata => {
  const request = ctx.switchToHttp().getRequest();

  const userData = request[MetadataKey.USER_DATA] as AuthorizeResponse;

  if (!userData) {
    throw new BusinessException(ErrorCode.AUTH_USER_DATA_NOT_FOUND, HttpStatus.UNAUTHORIZED);
  }

  return userData?.metadata;
});
