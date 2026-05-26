import { IsOptional, IsString } from 'class-validator';

export class SelectSepayBankAccountDto {
  @IsOptional()
  @IsString()
  bankAccountUuid?: string;

  @IsString()
  accountNumber!: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankShortName?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;
}
