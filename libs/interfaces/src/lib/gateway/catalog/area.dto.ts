import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateAreaRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateAreaRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

class ReorderItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderAreaRequestDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class AreaResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;
}
