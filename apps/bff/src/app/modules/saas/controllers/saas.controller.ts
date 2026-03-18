import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { CreateTenantRequestDto, TenantResponseDto, UpdateTenantRequestDto } from '@common/interfaces/gateway/saas';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CreateTenantTcpRequest,
  DeleteTenantTcpRequest,
  GetTenantByIdTcpRequest,
  TenantTcpResponse,
  UpdateTenantTcpRequest,
} from '@common/interfaces/tcp/saas';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map } from 'rxjs';

@ApiTags('SaaS')
@Controller('saas')
export class SaasController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Post()
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() body: CreateTenantRequestDto, @ProcessId() processId: string) {
    return this.saasClient
      .send<TenantTcpResponse, CreateTenantTcpRequest>(TCP_REQUEST_MESSAGE.SAAS.CREATE, {
        data: body,
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get()
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto[]> })
  @ApiOperation({ summary: 'Get all tenants' })
  findAll(@ProcessId() processId: string) {
    return this.saasClient.send<TenantTcpResponse[], void>(TCP_REQUEST_MESSAGE.SAAS.GET_LIST, { processId }).pipe(
      map(
        (response) =>
          new ResponseDto<TenantTcpResponse[]>({
            data: response.data,
            statusCode: response.statusCode,
            message: response.code as HTTP_MESSAGE,
          }),
      ),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Get tenant by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string) {
    return this.saasClient
      .send<TenantTcpResponse, GetTenantByIdTcpRequest>(TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID, {
        data: { id },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch(':id')
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Update tenant by id' })
  update(@Param('id') id: string, @Body() body: UpdateTenantRequestDto, @ProcessId() processId: string) {
    return this.saasClient
      .send<TenantTcpResponse, UpdateTenantTcpRequest>(TCP_REQUEST_MESSAGE.SAAS.UPDATE, {
        data: { id, ...body },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Delete(':id')
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete tenant by id' })
  remove(@Param('id') id: string, @ProcessId() processId: string) {
    return this.saasClient
      .send<boolean, DeleteTenantTcpRequest>(TCP_REQUEST_MESSAGE.SAAS.DELETE, {
        data: { id },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<boolean>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }
}
