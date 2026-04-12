import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { TableRepository } from '../repositories/table.repository';
import { Table, TableStatus } from '@common/entities/table.entity';
import { Area } from '@common/entities/area.entity';
import {
  CreateTableTcpRequest,
  GetTableListTcpRequest,
  GetTableByIdTcpRequest,
  UpdateTableTcpRequest,
  DeleteTableTcpRequest,
  UpdateTableStatusTcpRequest,
  ValidateQrTokenTcpRequest,
  RegenerateQrTokenTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: ['occupied'],
  occupied: ['billing'],
  billing: ['occupied', 'cleaning'],
  cleaning: ['available'],
};

@Injectable()
export class TableService {
  private readonly qrTokenSecret: string;

  constructor(
    private readonly tableRepository: TableRepository,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
    private readonly configService: ConfigService,
  ) {
    this.qrTokenSecret = this.configService.get<string>('QR_TOKEN_SECRET', 'default-secret-change-me');
  }

  private generateQrToken(tableId: string, tenantId: string): string {
    return createHmac('sha256', this.qrTokenSecret).update(`${tableId}${tenantId}`).digest('hex');
  }

  async create(data: CreateTableTcpRequest): Promise<Table> {
    const area = await this.areaRepo.findOne({
      where: { id: data.areaId, tenantId: data.tenantId },
    });
    if (!area) {
      throw new BadRequestException('Area not found in this tenant');
    }

    const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
    if (nameExists) {
      throw new BadRequestException('Table name already exists');
    }

    const table = await this.tableRepository.create({
      tenantId: data.tenantId,
      areaId: data.areaId,
      name: data.name.trim(),
      capacity: data.capacity ?? 1,
      status: 'available' as TableStatus,
      qrToken: 'temp',
      sessionId: null,
    });

    // Generate QR token with actual table ID
    const qrToken = this.generateQrToken(table.id, data.tenantId);
    const updated = await this.tableRepository.updateByIdAndTenant(table.id, data.tenantId, { qrToken });
    return updated!;
  }

  async getList(data: GetTableListTcpRequest): Promise<Table[]> {
    return this.tableRepository.findAllByTenant(data.tenantId, data.areaId, data.status);
  }

  async getById(data: GetTableByIdTcpRequest): Promise<Table> {
    const table = await this.tableRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async update(data: UpdateTableTcpRequest): Promise<Table> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
      if (nameExists) {
        throw new BadRequestException('Table name already exists');
      }
    }

    if (data.areaId) {
      const area = await this.areaRepo.findOne({
        where: { id: data.areaId, tenantId: data.tenantId },
      });
      if (!area) {
        throw new BadRequestException('Area not found in this tenant');
      }
    }

    const updatePayload: Partial<Table> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId;

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }

  async delete(data: DeleteTableTcpRequest): Promise<void> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (table.sessionId || table.status !== 'available') {
      throw new BadRequestException('Cannot delete active table');
    }

    await this.tableRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async updateStatus(data: UpdateTableStatusTcpRequest): Promise<Table> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });
    const newStatus = data.status as TableStatus;

    const allowedTransitions = VALID_TRANSITIONS[table.status as TableStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${table.status} → ${newStatus}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`,
      );
    }

    const updatePayload: Partial<Table> = { status: newStatus };

    if (newStatus === 'available') {
      updatePayload.sessionId = null;
    }
    if (newStatus === 'occupied' && data.sessionId) {
      updatePayload.sessionId = data.sessionId;
    }

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }

  async validateQrToken(data: ValidateQrTokenTcpRequest): Promise<Table> {
    const expectedToken = this.generateQrToken(data.tableId, data.tenantId);

    const tokenBuffer = Buffer.from(data.token, 'hex');
    const expectedBuffer = Buffer.from(expectedToken, 'hex');

    if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      throw new BadRequestException('Invalid QR token');
    }

    const table = await this.tableRepository.findByIdAndTenant(data.tableId, data.tenantId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async regenerateQrToken(data: RegenerateQrTokenTcpRequest): Promise<Table> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const newToken = this.generateQrToken(data.id, data.tenantId);
    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, { qrToken: newToken });
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }
}
