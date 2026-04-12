import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '@common/entities/category.entity';
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
      throw new BadRequestException('Category name already exists');
    }

    return this.categoryRepository.create({
      tenantId: data.tenantId,
      name: data.name.trim(),
      sortOrder: data.sortOrder ?? 0,
      status: (data.status as Category['status']) ?? 'active',
    });
  }

  async getList(data: GetCategoryListTcpRequest): Promise<Category[]> {
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }

  async getById(data: GetCategoryByIdTcpRequest): Promise<Category> {
    const category = await this.categoryRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(data: UpdateCategoryTcpRequest): Promise<Category> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const exists = await this.categoryRepository.existsByName(data.tenantId, data.name.trim());
      if (exists) {
        throw new BadRequestException('Category name already exists');
      }
    }

    const updatePayload: Partial<Category> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.status !== undefined) updatePayload.status = data.status as Category['status'];

    const updated = await this.categoryRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

  async delete(data: DeleteCategoryTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const menuItemCount = await this.menuItemRepo.count({
      where: { categoryId: data.id, tenantId: data.tenantId, deletedAt: IsNull() },
    });
    if (menuItemCount > 0) {
      throw new BadRequestException('Cannot delete category with active menu items');
    }

    await this.categoryRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async reorder(data: ReorderCategoryTcpRequest): Promise<Category[]> {
    await this.categoryRepository.batchUpdateSortOrder(data.tenantId, data.items);
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }
}
