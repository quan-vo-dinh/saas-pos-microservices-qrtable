import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

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

export class SepayWebhookRequestDto {
  @IsInt()
  @Min(1)
  id!: number;

  @IsString()
  @MaxLength(80)
  gateway!: string;

  @IsString()
  @MaxLength(40)
  transactionDate!: string;

  @IsString()
  @MaxLength(64)
  accountNumber!: string;

  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(64)
  code!: string | null;

  @IsString()
  @MaxLength(500)
  content!: string;

  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @IsNumber()
  @Min(1)
  transferAmount!: number;

  @IsNumber()
  accumulated!: number;

  @ValidateIf((_o, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(120)
  subAccount!: string | null;

  @IsString()
  @MaxLength(120)
  referenceCode!: string;

  @IsString()
  @MaxLength(500)
  description!: string;
}
