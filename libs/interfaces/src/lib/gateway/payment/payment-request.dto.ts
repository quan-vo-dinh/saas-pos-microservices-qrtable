import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateVietQrRequestDto {
  @IsUUID()
  billId!: string;
}

export class ConfirmCashRequestDto {
  @IsUUID()
  billId!: string;

  @IsInt()
  @IsPositive()
  amountReceived!: number;
}

export class RefundRequestDto {
  @IsUUID()
  paymentId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerBankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerBankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerAccountName?: string;
}

export class RefundConfirmRequestDto {
  @IsUUID()
  refundId!: string;
}
