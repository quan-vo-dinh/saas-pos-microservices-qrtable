import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import {
  CatalogResponseDto,
  CreateCatalogRequestDto,
  UpdateCatalogRequestDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CatalogTcpResponse,
  CreateCatalogTcpRequest,
  DeleteCatalogTcpRequest,
  GetCatalogByIdTcpRequest,
  UpdateCatalogTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map } from 'rxjs';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  constructor(@Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient) {}

  @Post()
  @ApiOkResponse({ type: ResponseDto<CatalogResponseDto> })
  @ApiOperation({ summary: 'Create a new catalog' })
  create(@Body() body: CreateCatalogRequestDto, @ProcessId() processId: string) {
    return this.catalogClient
      .send<CatalogTcpResponse, CreateCatalogTcpRequest>(TCP_REQUEST_MESSAGE.CATALOG.CREATE, {
        data: body,
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<CatalogTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get()
  @ApiOkResponse({ type: ResponseDto<CatalogResponseDto[]> })
  @ApiOperation({ summary: 'Get all catalogs' })
  findAll(@ProcessId() processId: string) {
    return this.catalogClient
      .send<CatalogTcpResponse[], void>(TCP_REQUEST_MESSAGE.CATALOG.GET_LIST, { processId })
      .pipe(
        map(
          (response) =>
            new ResponseDto<CatalogTcpResponse[]>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get(':id')
  @ApiOkResponse({ type: ResponseDto<CatalogResponseDto> })
  @ApiOperation({ summary: 'Get catalog by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string) {
    return this.catalogClient
      .send<CatalogTcpResponse, GetCatalogByIdTcpRequest>(TCP_REQUEST_MESSAGE.CATALOG.GET_BY_ID, {
        data: { id },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<CatalogTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch(':id')
  @ApiOkResponse({ type: ResponseDto<CatalogResponseDto> })
  @ApiOperation({ summary: 'Update catalog by id' })
  update(@Param('id') id: string, @Body() body: UpdateCatalogRequestDto, @ProcessId() processId: string) {
    return this.catalogClient
      .send<CatalogTcpResponse, UpdateCatalogTcpRequest>(TCP_REQUEST_MESSAGE.CATALOG.UPDATE, {
        data: { id, ...body },
        processId,
      })
      .pipe(
        map(
          (response) =>
            new ResponseDto<CatalogTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Delete(':id')
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete catalog by id' })
  remove(@Param('id') id: string, @ProcessId() processId: string) {
    return this.catalogClient
      .send<boolean, DeleteCatalogTcpRequest>(TCP_REQUEST_MESSAGE.CATALOG.DELETE, {
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
