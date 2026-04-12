import { Table } from '@common/entities/table.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TableRepository {
  constructor(@InjectRepository(Table) private readonly repo: Repository<Table>) {}

  create(data: Partial<Table>): Promise<Table> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string, areaId?: string, status?: string): Promise<Table[]> {
    const where: Record<string, unknown> = { tenantId };
    if (areaId) where.areaId = areaId;
    if (status) where.status = status;
    return this.repo.find({
      where,
      order: { areaId: 'ASC', name: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Table | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Table>): Promise<Table | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  findByQrToken(tenantId: string, qrToken: string): Promise<Table | null> {
    return this.repo.findOne({ where: { tenantId, qrToken } });
  }
}
