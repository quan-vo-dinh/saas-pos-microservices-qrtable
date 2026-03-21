import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthProfileResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  tenantId?: string;

  @ApiProperty({ type: [String] })
  roles: string[];

  @ApiProperty({ type: [String], required: false })
  permissions?: string[];
}
