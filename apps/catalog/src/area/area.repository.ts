import { Area } from '@common/entities/area.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AreaRepository {
  constructor(@InjectRepository(Area) private readonly repo: Repository<Area>) {}

  create(data: Partial<Area>): Promise<Area> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string): Promise<Area[]> {
    return this.repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Area | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Area>): Promise<Area | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  async batchUpdateSortOrder(tenantId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(Area, { id: item.id, tenantId }, { sortOrder: item.sortOrder });
      }
    });
  }
}
