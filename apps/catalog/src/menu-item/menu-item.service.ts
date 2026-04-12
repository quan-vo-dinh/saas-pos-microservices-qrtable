import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItemRepository } from './menu-item.repository';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import {
  CreateMenuItemTcpRequest,
  GetMenuItemListTcpRequest,
  GetMenuItemByIdTcpRequest,
  UpdateMenuItemTcpRequest,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MenuItemService {
  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(data: CreateMenuItemTcpRequest): Promise<MenuItem> {
    const category = await this.categoryRepo.findOne({
      where: { id: data.categoryId, tenantId: data.tenantId },
    });
    if (!category) {
      throw new BadRequestException('Category not found in this tenant');
    }

    return this.menuItemRepository.create({
      tenantId: data.tenantId,
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      stock: data.stock ?? 0,
      sortOrder: data.sortOrder ?? 0,
    });
  }

  async getList(data: GetMenuItemListTcpRequest): Promise<MenuItem[]> {
    return this.menuItemRepository.findAllByTenant(data.tenantId, data.categoryId);
  }

  async getById(data: GetMenuItemByIdTcpRequest): Promise<MenuItem> {
    const item = await this.menuItemRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async update(data: UpdateMenuItemTcpRequest): Promise<MenuItem> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: data.categoryId, tenantId: data.tenantId },
      });
      if (!category) {
        throw new BadRequestException('Category not found in this tenant');
      }
    }

    const updatePayload: Partial<MenuItem> = {};
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (data.stock !== undefined) updatePayload.stock = data.stock;
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.status !== undefined) updatePayload.status = data.status as MenuItem['status'];

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Menu item not found');
    }
    return updated;
  }

  async softDelete(data: SoftDeleteMenuItemTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });
    await this.menuItemRepository.softDelete(data.id, data.tenantId);
  }

  async updateImage(data: UpdateMenuItemImageTcpRequest): Promise<MenuItem> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, {
      imageUrl: data.imageUrl,
      imagePublicId: data.imagePublicId,
    });
    if (!updated) {
      throw new NotFoundException('Menu item not found');
    }
    return updated;
  }
}
