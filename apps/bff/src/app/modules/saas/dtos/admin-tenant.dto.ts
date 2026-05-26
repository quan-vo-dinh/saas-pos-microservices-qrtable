import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum TenantStatusActionDtoValue {
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  CLOSE = 'CLOSE',
}

export class AdminListTenantsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class OnboardTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  tenantName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tenantType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MaxLength(40)
  initialPlanCode!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  ownerPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ownerLastName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingModes?: string[];
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatusActionDtoValue)
  action!: TenantStatusActionDtoValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AssignTenantSubscriptionDto {
  @IsString()
  @MaxLength(40)
  planCode!: string;

  @IsOptional()
  @IsString()
  billingPeriod?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  source?: 'ADMIN_ASSIGN' | 'INVOICE_PAID';
}
