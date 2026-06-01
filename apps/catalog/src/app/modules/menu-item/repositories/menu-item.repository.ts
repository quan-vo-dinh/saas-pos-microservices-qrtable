import { MenuItem } from '@common/entities/menu-item.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';

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

  findManyByIdsAndTenant(tenantId: string, ids: string[]): Promise<MenuItem[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    const uniqueIds = [...new Set(ids)];
    return this.repo.find({
      where: { tenantId, id: In(uniqueIds), deletedAt: IsNull() },
    });
  }

  async findByIdsForUpdate(tenantId: string, ids: string[], manager: EntityManager): Promise<MenuItem[]> {
    if (ids.length === 0) {
      return [];
    }
    return manager
      .getRepository(MenuItem)
      .createQueryBuilder('menuItem')
      .setLock('pessimistic_write')
      .where('menuItem.tenantId = :tenantId', { tenantId })
      .andWhere('menuItem.id IN (:...ids)', { ids })
      .andWhere('menuItem.deletedAt IS NULL')
      .orderBy('menuItem.id', 'ASC')
      .getMany();
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<MenuItem>): Promise<MenuItem | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.softDelete({ id, tenantId });
  }

  async aggregateAvailabilityBreakdown(tenantId: string): Promise<Array<{ status: string; count: number }>> {
    const rows = await this.repo
      .createQueryBuilder('m')
      .select('m.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.deletedAt IS NULL')
      .groupBy('m.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count) || 0,
    }));
  }
}
