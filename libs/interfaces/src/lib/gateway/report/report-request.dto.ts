import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_REPORT_LIMIT = 10;
const MAX_REPORT_LIMIT = 20;

export class ReportRangeQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  grain?: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_REPORT_LIMIT)
  limit?: number = DEFAULT_REPORT_LIMIT;
}
