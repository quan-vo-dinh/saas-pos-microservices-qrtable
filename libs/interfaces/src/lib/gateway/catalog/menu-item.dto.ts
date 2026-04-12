import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateMenuItemRequestDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateMenuItemRequestDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['available', 'out_of_stock'] })
  @IsEnum(['available', 'out_of_stock'])
  @IsOptional()
  status?: string;
}

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

  @ApiProperty()
  status: string;
}
