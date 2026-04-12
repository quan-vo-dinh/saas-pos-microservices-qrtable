import { Category } from '@common/entities/category.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryRepository {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}

  create(data: Partial<Category>): Promise<Category> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string): Promise<Category[]> {
    return this.repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Category>): Promise<Category | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  async batchUpdateSortOrder(tenantId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(Category, { id: item.id, tenantId }, { sortOrder: item.sortOrder });
      }
    });
  }
}
