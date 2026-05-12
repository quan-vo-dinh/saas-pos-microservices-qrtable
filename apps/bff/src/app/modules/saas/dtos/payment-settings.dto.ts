import { IsOptional, IsString } from 'class-validator';

export class SelectSepayBankAccountDto {
  @IsString()
  bankAccountUuid!: string;

  @IsString()
  accountNumber!: string;

  @IsString()
  accountHolder!: string;

  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  bankShortName?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;
}
