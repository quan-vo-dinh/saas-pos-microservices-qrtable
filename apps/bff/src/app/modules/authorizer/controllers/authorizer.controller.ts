import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthProfileResponseDto, LoginRequestDto, LoginResponseDto } from '@common/interfaces/gateway/authorizer';
import { ProcessId } from '@common/decorators/processId.decorator';
import { LoginTcpRequest, LoginTcpResponse } from '@common/interfaces/tcp/authorizer';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { map } from 'rxjs';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { UserData } from '@common/decorators/userData.decorator';
import { AuthorizedMetadata } from '@common/interfaces/tcp/authorizer';
@ApiTags('Authorizer')
@Controller('authorizer')
export class AuthorizerController {
  constructor(@Inject(TCP_SERVICES.AUTHORIZER_SERVICE) private readonly authorizerClient: TcpClient) {}

  @Post('login')
  @ApiOkResponse({ type: ResponseDto<LoginResponseDto> })
  @ApiOperation({
    summary: 'Login with username and password',
  })
  login(@Body() body: LoginRequestDto, @ProcessId() processId: string) {
    return this.authorizerClient
      .send<LoginTcpResponse, LoginTcpRequest>(TCP_REQUEST_MESSAGE.AUTHORIZER.LOGIN, {
        data: body,
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<LoginResponseDto>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get('me')
  @Authorization({ secured: true })
  @ApiOkResponse({ type: ResponseDto<AuthProfileResponseDto> })
  @ApiOperation({ summary: 'Get authenticated user profile' })
  me(@UserData() userData: AuthorizedMetadata): ResponseDto<AuthProfileResponseDto> {
    const jwt = userData.jwt as Record<string, unknown> | undefined;
    const realmAccess = (jwt?.['realm_access'] as Record<string, unknown> | undefined) || undefined;
    const roles = Array.isArray(realmAccess?.['roles']) ? (realmAccess?.['roles'] as string[]) : [];

    return new ResponseDto<AuthProfileResponseDto>({
      data: {
        userId: userData.userId || '',
        email: typeof jwt?.['email'] === 'string' ? (jwt['email'] as string) : undefined,
        tenantId:
          typeof jwt?.['tenant_id'] === 'string'
            ? (jwt['tenant_id'] as string)
            : typeof jwt?.['tenantId'] === 'string'
              ? (jwt['tenantId'] as string)
              : undefined,
        roles,
        permissions: userData.permissions as string[] | undefined,
      },
      message: HTTP_MESSAGE.OK,
    });
  }
}
