import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { CATEGORY_STATUS, MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class MenuRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  findActiveCategories(tenantId: string): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { tenantId, status: CATEGORY_STATUS.ACTIVE },
      order: { sortOrder: 'ASC' },
    });
  }

  findAvailableItemsByCategory(tenantId: string, categoryId: string): Promise<MenuItem[]> {
    return this.menuItemRepo.find({
      where: {
        tenantId,
        categoryId,
        status: MENU_ITEM_STATUS.AVAILABLE,
        deletedAt: IsNull(),
      },
      order: { sortOrder: 'ASC' },
    });
  }
}
