import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductTcpRequest } from '@common/interfaces/tcp/product/product-request.interface';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}
  async create(data: CreateProductTcpRequest) {
    const { sku, name } = data;

    const exists = await this.productRepository.exists(sku, name);
    if (exists) {
      throw new BusinessException(ErrorCode.PRODUCT_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    return this.productRepository.create(data);
  }

  getList() {
    return this.productRepository.findAll();
  }
}
