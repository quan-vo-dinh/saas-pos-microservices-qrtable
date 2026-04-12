import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AreaRepository } from '../repositories/area.repository';
import { Area } from '@common/entities/area.entity';
import {
  CreateAreaTcpRequest,
  GetAreaListTcpRequest,
  GetAreaByIdTcpRequest,
  UpdateAreaTcpRequest,
  DeleteAreaTcpRequest,
  ReorderAreaTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Table } from '@common/entities/table.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AreaService {
  constructor(
    private readonly areaRepository: AreaRepository,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
  ) {}

  async create(data: CreateAreaTcpRequest): Promise<Area> {
    const exists = await this.areaRepository.existsByName(data.tenantId, data.name.trim());
    if (exists) {
      throw new BadRequestException('Area name already exists');
    }

    return this.areaRepository.create({
      tenantId: data.tenantId,
      name: data.name.trim(),
      sortOrder: data.sortOrder ?? 0,
    });
  }

  async getList(data: GetAreaListTcpRequest): Promise<Area[]> {
    return this.areaRepository.findAllByTenant(data.tenantId);
  }

  async getById(data: GetAreaByIdTcpRequest): Promise<Area> {
    const area = await this.areaRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!area) {
      throw new NotFoundException('Area not found');
    }
    return area;
  }

  async update(data: UpdateAreaTcpRequest): Promise<Area> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const exists = await this.areaRepository.existsByName(data.tenantId, data.name.trim());
      if (exists) {
        throw new BadRequestException('Area name already exists');
      }
    }

    const updatePayload: Partial<Area> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;

    const updated = await this.areaRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Area not found');
    }
    return updated;
  }

  async delete(data: DeleteAreaTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const tableCount = await this.tableRepo.count({
      where: { areaId: data.id, tenantId: data.tenantId },
    });
    if (tableCount > 0) {
      throw new BadRequestException('Cannot delete area with tables');
    }

    await this.areaRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async reorder(data: ReorderAreaTcpRequest): Promise<Area[]> {
    await this.areaRepository.batchUpdateSortOrder(data.tenantId, data.items);
    return this.areaRepository.findAllByTenant(data.tenantId);
  }
}
