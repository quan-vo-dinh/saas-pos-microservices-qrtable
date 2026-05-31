import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Controller, UseInterceptors } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { MessagePattern } from '@nestjs/microservices';
import { RequestParams } from '@common/decorators/request-param.decorator';
import {
  ChangeStaffRoleTcpRequest,
  CreateStaffTcpRequest,
  CreateUserTcpRequest,
  GetStaffTcpRequest,
  ListStaffTcpRequest,
  SetStaffStatusTcpRequest,
} from '@common/interfaces/tcp/user';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { User } from '@common/schemas/user.schema';
import {
  CountTenantUsersRequest,
  DisableTenantUsersRequest,
  UpsertTenantOwnerProfileRequest,
} from '@common/interfaces/tcp/user';
import { TenantUserService } from '../services/tenant-user.service';
import { StaffManagementService } from '../services/staff-management.service';

@Controller('users')
@UseInterceptors(TcpLoggingInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tenantUserService: TenantUserService,
    private readonly staffManagementService: StaffManagementService,
  ) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.CREATE)
  async create(@RequestParams() data: CreateUserTcpRequest, @ProcessId() processId: string): Promise<Response<string>> {
    await this.userService.create(data, processId);

    return Response.success<string>(HTTP_MESSAGE.CREATED);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID)
  async getByUserId(@RequestParams() userId: string): Promise<Response<User>> {
    const user = await this.userService.getUserByUserId(userId);
    return Response.success<User>(user);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT)
  async upsertWithTenant(@RequestParams() data: UpsertTenantOwnerProfileRequest): Promise<Response<User>> {
    const user = await this.tenantUserService.upsertOwnerProfile(data);
    return Response.success<User>(user);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.UPSERT_TENANT_OWNER_PROFILE)
  async upsertTenantOwnerProfile(@RequestParams() data: UpsertTenantOwnerProfileRequest): Promise<Response<User>> {
    const user = await this.tenantUserService.upsertOwnerProfile(data);
    return Response.success<User>(user);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.DISABLE_TENANT_USERS)
  async disableTenantUsers(@RequestParams() data: DisableTenantUsersRequest) {
    const result = await this.tenantUserService.disableTenantUsers(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.COUNT_BY_TENANT)
  async countByTenant(@RequestParams() data: CountTenantUsersRequest) {
    const result = await this.tenantUserService.countTenantUsers(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.FIND_OWNER_BY_TENANT)
  async findOwnerByTenant(@RequestParams() data: { tenantId: string }) {
    const user = await this.tenantUserService.findOwnerByTenantId(data.tenantId);
    return Response.success(user);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_CREATE)
  async createStaff(@RequestParams() data: CreateStaffTcpRequest) {
    const result = await this.staffManagementService.createStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_LIST)
  async listStaff(@RequestParams() data: ListStaffTcpRequest) {
    const result = await this.staffManagementService.listStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_GET)
  async getStaff(@RequestParams() data: GetStaffTcpRequest) {
    const result = await this.staffManagementService.getStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_CHANGE_ROLE)
  async changeStaffRole(@RequestParams() data: ChangeStaffRoleTcpRequest) {
    const result = await this.staffManagementService.changeRole(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS)
  async setStaffStatus(@RequestParams() data: SetStaffStatusTcpRequest) {
    const result = await this.staffManagementService.setStatus(data);
    return Response.success(result);
  }
}
