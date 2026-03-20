import { applyDecorators, SetMetadata } from '@nestjs/common';
import { MetadataKey } from '@common/constants/common.constant';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { REQUEST_HEADERS } from '@common/constants/request-context.constant';

export const Authorization = ({ secured = false }: { secured?: boolean }) => {
  const setMetadata = SetMetadata(MetadataKey.SECURED, {
    secured,
  });
  if (secured) {
    const decorators = [
      ApiBearerAuth(),
      ApiHeader({
        name: REQUEST_HEADERS.TENANT_ID,
        required: false,
        description: 'Tenant context for local/dev requests. Example: tenant_a',
      }),
    ];
    return applyDecorators(...decorators, setMetadata);
  }
  return setMetadata;
};
