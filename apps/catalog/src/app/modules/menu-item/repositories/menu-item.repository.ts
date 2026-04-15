import { MenuItem } from '@common/entities/menu-item.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class MenuItemRepository {
  constructor(@InjectRepository(MenuItem) private readonly repo: Repository<MenuItem>) {}

  create(data: Partial<MenuItem>): Promise<MenuItem> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string, categoryId?: string): Promise<MenuItem[]> {
    const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    return this.repo.find({
      where,
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<MenuItem | null> {
    return this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<MenuItem>): Promise<MenuItem | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.softDelete({ id, tenantId });
  }
}
