import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class JoinSessionRequestDto {
  @ApiProperty()
  @IsUUID()
  tableId: string;

  @ApiProperty({ description: 'Hex QR token from scan (Catalog HMAC)' })
  @IsString()
  @IsNotEmpty()
  qrToken: string;
}

export class SubmitOrderRequestDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedCartVersion: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CartMutateRequestDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedCartVersion: number;

  @ApiProperty({ enum: ['ADD_ITEM', 'SET_QUANTITY', 'UPDATE_NOTE', 'REMOVE_LINE', 'CLEAR'] })
  @IsIn(['ADD_ITEM', 'SET_QUANTITY', 'UPDATE_NOTE', 'REMOVE_LINE', 'CLEAR'])
  operation: 'ADD_ITEM' | 'SET_QUANTITY' | 'UPDATE_NOTE' | 'REMOVE_LINE' | 'CLEAR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cartLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionClientId?: string;
}

export class CreateCustomerServiceRequestDto {
  @ApiProperty({ enum: ['CALL_STAFF', 'REQUEST_BILL', 'GENERAL_HELP'] })
  @IsIn(['CALL_STAFF', 'REQUEST_BILL', 'GENERAL_HELP'])
  type: 'CALL_STAFF' | 'REQUEST_BILL' | 'GENERAL_HELP';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CancelProcessingRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class StaffCancelPendingRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferTableRequestDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  fromTableId: string;

  @ApiProperty()
  @IsUUID()
  toTableId: string;

  @ApiProperty({ description: 'Client-generated idempotency key for transfer locks' })
  @IsUUID()
  requestId: string;
}

export class ReleaseEmptyTableSessionRequestDto {
  @ApiProperty()
  @IsUUID()
  sessionId: string;
}

export class CustomerCancelOrderRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
