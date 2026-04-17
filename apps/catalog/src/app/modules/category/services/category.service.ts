import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '@common/entities/category.entity';
import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';
import {
  CreateCategoryTcpRequest,
  GetCategoryListTcpRequest,
  GetCategoryByIdTcpRequest,
  UpdateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  ReorderCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { MenuItem } from '@common/entities/menu-item.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async create(data: CreateCategoryTcpRequest): Promise<Category> {
    const exists = await this.categoryRepository.existsByName(data.tenantId, data.name.trim());
    if (exists) {
      throw new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT);
    }

    return this.categoryRepository.create({
      tenantId: data.tenantId,
      name: data.name.trim(),
      sortOrder: data.sortOrder ?? 0,
      status: data.status ?? CATEGORY_STATUS.ACTIVE,
    });
  }

  async getList(data: GetCategoryListTcpRequest): Promise<Category[]> {
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }

  async getById(data: GetCategoryByIdTcpRequest): Promise<Category> {
    const category = await this.categoryRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!category) {
      throw new BusinessException(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return category;
  }

  async update(data: UpdateCategoryTcpRequest): Promise<Category> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const exists = await this.categoryRepository.existsByName(data.tenantId, data.name.trim());
      if (exists) {
        throw new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT);
      }
    }

    const updatePayload: Partial<Category> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.status !== undefined) updatePayload.status = data.status;

    const updated = await this.categoryRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async delete(data: DeleteCategoryTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const menuItemCount = await this.menuItemRepo.count({
      where: { categoryId: data.id, tenantId: data.tenantId, deletedAt: IsNull() },
    });
    if (menuItemCount > 0) {
      throw new BusinessException(ErrorCode.CATALOG_CATEGORY_HAS_ACTIVE_ITEMS, HttpStatus.CONFLICT);
    }

    await this.categoryRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async reorder(data: ReorderCategoryTcpRequest): Promise<Category[]> {
    await this.categoryRepository.batchUpdateSortOrder(data.tenantId, data.items);
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }
}
