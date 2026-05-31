import { ROLE } from '@common/constants/enum/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../common/base-response.dto';

const STAFF_ROLE_NAMES = [ROLE.MANAGER, ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;

export class UserResponseDto extends BaseResponseDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: [String] })
  roles: string[];
}

export class StaffProfileResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ enum: STAFF_ROLE_NAMES })
  roleName: (typeof STAFF_ROLE_NAMES)[number];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ nullable: true })
  disabledAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StaffListResponseDto {
  @ApiProperty({ type: [StaffProfileResponseDto] })
  items: StaffProfileResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
