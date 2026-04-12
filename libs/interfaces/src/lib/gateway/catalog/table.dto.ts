import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateTableRequestDto {
  @ApiProperty()
  @IsUUID()
  areaId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class UpdateTableRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  areaId?: string;
}

export class UpdateTableStatusRequestDto {
  @ApiProperty({ enum: ['available', 'occupied', 'billing', 'cleaning'] })
  @IsEnum(['available', 'occupied', 'billing', 'cleaning'])
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class ValidateQrTokenRequestDto {
  @ApiProperty()
  @IsUUID()
  tableId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class TableResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  areaId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  qrToken: string;

  @ApiPropertyOptional()
  sessionId: string | null;
}
