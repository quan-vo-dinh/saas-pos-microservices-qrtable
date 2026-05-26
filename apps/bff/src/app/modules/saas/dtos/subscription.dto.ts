import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckoutSubscriptionDto {
  @IsString()
  @MaxLength(40)
  planCode!: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  billingPeriod!: 'MONTHLY' | 'YEARLY';
}

export class CancelSubscriptionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ManualConfirmSubscriptionInvoiceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
