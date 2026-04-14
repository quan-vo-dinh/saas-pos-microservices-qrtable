import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from '../common/base-response.dto';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';

export class MenuItemResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiPropertyOptional()
  imagePublicId: string | null;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ enum: MENU_ITEM_STATUS })
  status: MENU_ITEM_STATUS;
}
