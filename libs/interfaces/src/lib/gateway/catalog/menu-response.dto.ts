import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';

export class PublicMenuItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiProperty({ enum: MENU_ITEM_STATUS })
  status: MENU_ITEM_STATUS;
}

export class PublicMenuCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [PublicMenuItemDto] })
  items: PublicMenuItemDto[];
}

export class PublicMenuResponseDto {
  @ApiProperty({ type: [PublicMenuCategoryDto] })
  categories: PublicMenuCategoryDto[];
}
