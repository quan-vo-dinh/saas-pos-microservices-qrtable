import { PreparationStation } from '@einvoice/types';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class KdsQueueQueryDto {
  @IsEnum(PreparationStation)
  station: PreparationStation;
}

export class KdsTicketActionRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}

export class KdsRecallTicketRequestDto extends KdsTicketActionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class KdsSetPriorityRequestDto extends KdsTicketActionRequestDto {
  @IsBoolean()
  priority: boolean;
}
