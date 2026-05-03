import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import {
  CreateMenuItemTcpRequest,
  GetMenuItemListTcpRequest,
  GetMenuItemByIdTcpRequest,
  UpdateMenuItemTcpRequest,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
  ClearMenuItemImageTcpRequest,
  ValidateOrderableTcpRequest,
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
  type ValidateOrderableItemInput,
  type OrderableMenuItemSnapshot,
  type StockMutationResult,
} from '@common/interfaces/tcp/catalog';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class MenuItemService {
  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly dataSource: DataSource,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(data: CreateMenuItemTcpRequest): Promise<MenuItem> {
    const category = await this.categoryRepo.findOne({
      where: { id: data.categoryId, tenantId: data.tenantId },
    });
    if (!category) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }

    return this.menuItemRepository.create({
      tenantId: data.tenantId,
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      stock: data.stock ?? 0,
      sortOrder: data.sortOrder ?? 0,
      station: data.station ?? PREPARATION_STATION.KITCHEN,
    });
  }

  async getList(data: GetMenuItemListTcpRequest): Promise<MenuItem[]> {
    return this.menuItemRepository.findAllByTenant(data.tenantId, data.categoryId);
  }

  async getById(data: GetMenuItemByIdTcpRequest): Promise<MenuItem> {
    const item = await this.menuItemRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!item) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
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
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND, HttpStatus.BAD_REQUEST);
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
    if (data.station !== undefined) updatePayload.station = data.station;

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
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
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async clearImage(data: ClearMenuItemImageTcpRequest): Promise<MenuItem> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, {
      imageUrl: null,
      imagePublicId: null,
    });
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async validateOrderable(data: ValidateOrderableTcpRequest): Promise<OrderableMenuItemSnapshot[]> {
    const ids = data.items.map((item) => item.menuItemId);
    const items = await this.menuItemRepository.findManyByIdsAndTenant(data.tenantId, ids);
    const byId = new Map(items.map((item) => [item.id, item]));

    return data.items.map((input) => {
      const item = byId.get(input.menuItemId);
      if (!item || item.status !== MENU_ITEM_STATUS.AVAILABLE) {
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_ORDERABLE, HttpStatus.CONFLICT, {
          menuItemId: input.menuItemId,
        });
      }

      return {
        menuItemId: item.id,
        menuItemName: item.name,
        menuItemImageUrl: item.imageUrl ?? null,
        unitPrice: Number(item.price),
        status: item.status,
        stock: item.stock,
        station: item.station,
      };
    });
  }

  async deductForOrder(data: StockDeductForOrderTcpRequest): Promise<StockMutationResult[]> {
    const quantities = this.aggregateQuantities(data.items);
    const sortedIds = [...quantities.keys()].sort();
    this.ensurePositiveQuantities(quantities);

    return this.dataSource.transaction(async (manager) => {
      const locked = await this.menuItemRepository.findByIdsForUpdate(data.tenantId, sortedIds, manager);
      if (locked.length !== sortedIds.length) {
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const byId = new Map(locked.map((row) => [row.id, row]));
      const results: StockMutationResult[] = [];

      for (const id of sortedIds) {
        const item = byId.get(id) as MenuItem;
        const qty = quantities.get(id) as number;
        if (item.stock < qty) {
          throw new BusinessException(ErrorCode.CATALOG_STOCK_INSUFFICIENT, HttpStatus.CONFLICT, {
            menuItemId: id,
          });
        }

        item.stock -= qty;
        item.status = item.stock === 0 ? MENU_ITEM_STATUS.OUT_OF_STOCK : MENU_ITEM_STATUS.AVAILABLE;

        await manager.save(MenuItem, item);
        results.push({
          menuItemId: item.id,
          menuItemName: item.name,
          requestedQuantity: qty,
          remainingStock: item.stock,
          status: item.status,
        });
      }

      return results;
    });
  }

  async releaseForOrder(data: StockReleaseForOrderTcpRequest): Promise<StockMutationResult[]> {
    const quantities = this.aggregateQuantities(data.items);
    const sortedIds = [...quantities.keys()].sort();
    this.ensurePositiveQuantities(quantities);

    return this.dataSource.transaction(async (manager) => {
      const locked = await this.menuItemRepository.findByIdsForUpdate(data.tenantId, sortedIds, manager);
      if (locked.length !== sortedIds.length) {
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const byId = new Map(locked.map((row) => [row.id, row]));
      const results: StockMutationResult[] = [];

      for (const id of sortedIds) {
        const item = byId.get(id) as MenuItem;
        const qty = quantities.get(id) as number;

        item.stock += qty;
        if (item.stock > 0) {
          item.status = MENU_ITEM_STATUS.AVAILABLE;
        }

        await manager.save(MenuItem, item);
        results.push({
          menuItemId: item.id,
          menuItemName: item.name,
          requestedQuantity: qty,
          remainingStock: item.stock,
          status: item.status,
        });
      }

      return results;
    });
  }

  private aggregateQuantities(items: ValidateOrderableItemInput[]): Map<string, number> {
    const quantities = new Map<string, number>();
    for (const line of items) {
      quantities.set(line.menuItemId, (quantities.get(line.menuItemId) ?? 0) + line.quantity);
    }
    return quantities;
  }

  private ensurePositiveQuantities(quantities: Map<string, number>): void {
    for (const [menuItemId, qty] of quantities) {
      if (!Number.isFinite(qty) || qty < 1) {
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST, {
          menuItemId,
        });
      }
    }
  }
}
