import { CreateUserTcpRequest } from '@common/interfaces/tcp/user';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserRequestDto } from '@common/interfaces/gateway/user';
import { ProcessId } from '@common/decorators/processId.decorator';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { map } from 'rxjs';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { MetadataKey } from '@common/constants/common.constant';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(@Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private readonly userAccessClient: TcpClient) {}

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.USER_CREATE])
  @ApiOkResponse({ type: ResponseDto<string> })
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() body: CreateUserRequestDto, @ProcessId() processId: string, @Req() request: Request) {
    const tenantId = request[MetadataKey.TENANT_ID] as string | undefined;

    return this.userAccessClient
      .send<string, CreateUserTcpRequest>(TCP_REQUEST_MESSAGE.USER.CREATE, {
        data: {
          ...body,
          tenantId,
        },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<string>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }
}
