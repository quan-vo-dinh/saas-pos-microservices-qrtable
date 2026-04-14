import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';

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
  @ApiProperty({ enum: TABLE_STATUS })
  @IsEnum(TABLE_STATUS)
  status: TABLE_STATUS;

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
