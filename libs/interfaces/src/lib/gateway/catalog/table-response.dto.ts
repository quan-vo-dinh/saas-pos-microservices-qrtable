import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from '../common/base-response.dto';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';

export class TableResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  areaId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty({ enum: TABLE_STATUS })
  status: TABLE_STATUS;

  @ApiProperty()
  qrToken: string;

  @ApiPropertyOptional()
  sessionId: string | null;
}
