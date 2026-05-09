import { SetMetadata } from '@nestjs/common';
import { MetadataKey } from '@common/constants/common.constant';

export const RawResponse = () => SetMetadata(MetadataKey.SKIP_RESPONSE_WRAPPER, true);
