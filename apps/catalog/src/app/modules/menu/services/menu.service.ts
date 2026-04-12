import { Injectable } from '@nestjs/common';
import { MenuRepository } from '../repositories/menu.repository';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';

@Injectable()
export class MenuService {
  constructor(private readonly menuRepository: MenuRepository) {}

  async getPublicMenu(data: GetPublicMenuTcpRequest): Promise<PublicMenuTcpResponse> {
    const categories = await this.menuRepository.findActiveCategories(data.tenantId);

    const result = await Promise.all(
      categories.map(async (category) => {
        const items = await this.menuRepository.findAvailableItemsByCategory(data.tenantId, category.id);

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
