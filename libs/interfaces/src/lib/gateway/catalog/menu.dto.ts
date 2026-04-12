import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty()
  status: string;
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
