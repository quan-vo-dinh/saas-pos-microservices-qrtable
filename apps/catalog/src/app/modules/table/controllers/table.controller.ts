import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  TableTcpResponse,
  CreateTableTcpRequest,
  GetTableListTcpRequest,
  GetTableByIdTcpRequest,
  UpdateTableTcpRequest,
  DeleteTableTcpRequest,
  UpdateTableStatusTcpRequest,
  ValidateQrTokenTcpRequest,
  RegenerateQrTokenTcpRequest,
  CountTenantTablesRequest,
  CountTenantTablesResponse,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import type { CatalogTableReportRequest, CatalogTableReportResponse } from '@common/interfaces/tcp/catalog';
import { CatalogReportService } from '../services/catalog-report.service';
import { TableService } from '../services/table.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class TableController {
  constructor(
    private readonly tableService: TableService,
    private readonly catalogReportService: CatalogReportService,
  ) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.CREATE)
  async create(@RequestParams() body: CreateTableTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.create(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.GET_LIST)
  async getList(@RequestParams() body: GetTableListTcpRequest): Promise<Response<TableTcpResponse[]>> {
    const result = await this.tableService.getList(body);
    return Response.success<TableTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.GET_BY_ID)
  async getById(@RequestParams() body: GetTableByIdTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.getById(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.UPDATE)
  async update(@RequestParams() body: UpdateTableTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.update(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.DELETE)
  async remove(@RequestParams() body: DeleteTableTcpRequest): Promise<Response<boolean>> {
    await this.tableService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS)
  async updateStatus(@RequestParams() body: UpdateTableStatusTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.updateStatus(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN)
  async validateQrToken(@RequestParams() body: ValidateQrTokenTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.validateQrToken(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.REGENERATE_QR_TOKEN)
  async regenerateQrToken(@RequestParams() body: RegenerateQrTokenTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.regenerateQrToken(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.COUNT_TABLES_BY_TENANT)
  async countTablesByTenant(
    @RequestParams() body: CountTenantTablesRequest,
  ): Promise<Response<CountTenantTablesResponse>> {
    const result = await this.tableService.countTablesByTenant(body);
    return Response.success<CountTenantTablesResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.COUNT_TABLES)
  async countTables(@RequestParams() body: CountTenantTablesRequest): Promise<Response<CountTenantTablesResponse>> {
    const result = await this.tableService.countTablesByTenant(body);
    return Response.success<CountTenantTablesResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES)
  async reportTables(@RequestParams() body: CatalogTableReportRequest): Promise<Response<CatalogTableReportResponse>> {
    return Response.success(await this.catalogReportService.getTableReport(body));
  }
}
