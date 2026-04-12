import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async getPublicMenu(data: GetPublicMenuTcpRequest): Promise<PublicMenuTcpResponse> {
    const categories = await this.categoryRepo.find({
      where: { tenantId: data.tenantId, status: 'active' },
      order: { sortOrder: 'ASC' },
    });

    const result = await Promise.all(
      categories.map(async (category) => {
        const items = await this.menuItemRepo.find({
          where: {
            tenantId: data.tenantId,
            categoryId: category.id,
            status: 'available',
            deletedAt: IsNull(),
          },
          order: { sortOrder: 'ASC' },
        });

        return {
          id: category.id,
          name: category.name,
          sortOrder: category.sortOrder,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            imageUrl: item.imageUrl,
            status: item.status,
          })),
        };
      }),
    );

    return { categories: result };
  }
}
