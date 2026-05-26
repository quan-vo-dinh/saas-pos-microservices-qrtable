import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ListPlansQueryDto {
  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  billingPeriod?: 'MONTHLY' | 'YEARLY';
}

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  priceVnd!: number;

  @IsIn(['MONTHLY', 'YEARLY'])
  billingPeriod!: 'MONTHLY' | 'YEARLY';

  @IsInt()
  @Min(-1)
  maxTables!: number;

  @IsInt()
  @Min(-1)
  maxStaff!: number;

  @IsInt()
  @Min(-1)
  maxOrdersPerDay!: number;

  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceVnd?: number;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingPeriod?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxTables?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxStaff?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxOrdersPerDay?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
