import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../common/base-response.dto';

/** Public tenant metadata for QR bootstrap (no audit/subscription fields). */
export class PublicTenantMetadataDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'CLOSED'] })
  status!: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

  @ApiProperty({ required: false, nullable: true })
  suspendedReason?: string | null;
}

export class TenantResponseDto extends BaseResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isActive: boolean;
}
