import { ROLE } from '@common/constants/enum/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const STAFF_ROLE_NAMES = [ROLE.MANAGER, ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;

export class CreateUserRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @IsArray()
  roles: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateStaffRequestDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: STAFF_ROLE_NAMES })
  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName: (typeof STAFF_ROLE_NAMES)[number];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requirePasswordUpdate?: boolean;
}

export class ListStaffQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: STAFF_ROLE_NAMES })
  @IsOptional()
  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName?: (typeof STAFF_ROLE_NAMES)[number];

  @ApiProperty({ required: false, enum: ['ACTIVE', 'DISABLED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ChangeStaffRoleDto {
  @ApiProperty({ enum: STAFF_ROLE_NAMES })
  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName: (typeof STAFF_ROLE_NAMES)[number];
}

export class SetStaffStatusDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
