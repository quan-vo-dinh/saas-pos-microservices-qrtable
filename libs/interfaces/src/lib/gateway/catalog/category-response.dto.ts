import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../common/base-response.dto';
import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';

export class CategoryResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: CATEGORY_STATUS })
  status: CATEGORY_STATUS;
}
