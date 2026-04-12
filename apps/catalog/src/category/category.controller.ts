import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CategoryTcpResponse,
  CreateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  GetCategoryByIdTcpRequest,
  GetCategoryListTcpRequest,
  ReorderCategoryTcpRequest,
  UpdateCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CategoryService } from './category.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.CREATE)
  async create(@RequestParams() body: CreateCategoryTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.create(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.GET_LIST)
  async getList(@RequestParams() body: GetCategoryListTcpRequest): Promise<Response<CategoryTcpResponse[]>> {
    const result = await this.categoryService.getList(body);
    return Response.success<CategoryTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.GET_BY_ID)
  async getById(@RequestParams() body: GetCategoryByIdTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.getById(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.UPDATE)
  async update(@RequestParams() body: UpdateCategoryTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.update(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.DELETE)
  async remove(@RequestParams() body: DeleteCategoryTcpRequest): Promise<Response<boolean>> {
    await this.categoryService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.REORDER)
  async reorder(@RequestParams() body: ReorderCategoryTcpRequest): Promise<Response<CategoryTcpResponse[]>> {
    const result = await this.categoryService.reorder(body);
    return Response.success<CategoryTcpResponse[]>(result);
  }
}
