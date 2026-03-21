import { Controller } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { GrpcMethod } from '@nestjs/microservices';
import { UpsertIdentityRequest, UserById } from '@common/interfaces/grpc/user-access';
import { Response } from '@common/interfaces/grpc/common/response.interface';
import { User } from '@common/schemas/user.schema';

@Controller()
export class UserGrpcController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod('UserAccessService', 'getByUserId')
  async getByUserId(payload: UserById): Promise<Response<User>> {
    const result = await this.userService.getUserByUserId(payload.userId);

    return Response.success<User>(result);
  }

  @GrpcMethod('UserAccessService', 'upsertByIdentity')
  async upsertByIdentity(payload: UpsertIdentityRequest): Promise<Response<User>> {
    const result = await this.userService.upsertUserByIdentity({
      userId: payload.userId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      roleNames: payload.roleNames,
    });

    return Response.success<User>(result);
  }
}
