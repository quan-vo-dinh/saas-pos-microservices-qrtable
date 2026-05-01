import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { randomBytes, timingSafeEqual } from 'crypto';
import { TableRepository } from '../repositories/table.repository';
import { Table } from '@common/entities/table.entity';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
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

const VALID_TRANSITIONS: Record<TABLE_STATUS, TABLE_STATUS[]> = {
  [TABLE_STATUS.AVAILABLE]: [TABLE_STATUS.OCCUPIED],
  [TABLE_STATUS.OCCUPIED]: [TABLE_STATUS.BILLING],
  [TABLE_STATUS.BILLING]: [TABLE_STATUS.OCCUPIED, TABLE_STATUS.CLEANING],
  [TABLE_STATUS.CLEANING]: [TABLE_STATUS.AVAILABLE],
};

@Injectable()
export class TableService {
  constructor(
    private readonly tableRepository: TableRepository,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
  ) {}

  private generateQrToken(): string {
    return randomBytes(32).toString('hex');
  }

  async create(data: CreateTableTcpRequest): Promise<Table> {
    const area = await this.areaRepo.findOne({
      where: { id: data.areaId, tenantId: data.tenantId },
    });
    if (!area) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }

    const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
    if (nameExists) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_DUPLICATE_NAME, HttpStatus.CONFLICT);
    }

    const table = await this.tableRepository.create({
      tenantId: data.tenantId,
      areaId: data.areaId,
      name: data.name.trim(),
      capacity: data.capacity ?? 1,
      status: TABLE_STATUS.AVAILABLE,
      qrToken: 'temp',
      sessionId: null,
    });

    const qrToken = this.generateQrToken();
    const updated = await this.tableRepository.updateByIdAndTenant(table.id, data.tenantId, { qrToken });
    return updated!;
  }

  async getList(data: GetTableListTcpRequest): Promise<Table[]> {
    return this.tableRepository.findAllByTenant(data.tenantId, data.areaId, data.status);
  }

  async getById(data: GetTableByIdTcpRequest): Promise<Table> {
    const table = await this.tableRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!table) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return table;
  }

  async update(data: UpdateTableTcpRequest): Promise<Table> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
      if (nameExists) {
        throw new BusinessException(ErrorCode.CATALOG_TABLE_DUPLICATE_NAME, HttpStatus.CONFLICT);
      }
    }

    if (data.areaId) {
      const area = await this.areaRepo.findOne({
        where: { id: data.areaId, tenantId: data.tenantId },
      });
      if (!area) {
        throw new BusinessException(ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND, HttpStatus.BAD_REQUEST);
      }
    }

    const updatePayload: Partial<Table> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId;

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async delete(data: DeleteTableTcpRequest): Promise<void> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (table.sessionId || table.status !== TABLE_STATUS.AVAILABLE) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_CANNOT_DELETE_ACTIVE, HttpStatus.CONFLICT);
    }

    await this.tableRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async updateStatus(data: UpdateTableStatusTcpRequest): Promise<Table> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });
    const newStatus = data.status;

    const allowedTransitions = VALID_TRANSITIONS[table.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, HttpStatus.BAD_REQUEST, {
        current: table.status,
        new: newStatus,
        allowed: allowedTransitions?.join(', ') || 'none',
      });
    }

    const updatePayload: Partial<Table> = { status: newStatus };

    if (newStatus === TABLE_STATUS.AVAILABLE) {
      updatePayload.sessionId = null;
    }
    if (newStatus === TABLE_STATUS.OCCUPIED && data.sessionId) {
      updatePayload.sessionId = data.sessionId;
    }

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async validateQrToken(data: ValidateQrTokenTcpRequest): Promise<Table> {
    const table = await this.tableRepository.findByIdAndTenant(data.tableId, data.tenantId);
    if (!table) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!/^[a-f0-9]{64}$/i.test(data.token) || !/^[a-f0-9]{64}$/i.test(table.qrToken)) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN, HttpStatus.FORBIDDEN);
    }

    const tokenBuffer = Buffer.from(data.token, 'hex');
    const storedBuffer = Buffer.from(table.qrToken, 'hex');

    if (tokenBuffer.length !== storedBuffer.length || !timingSafeEqual(tokenBuffer, storedBuffer)) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN, HttpStatus.FORBIDDEN);
    }

    return table;
  }

  async regenerateQrToken(data: RegenerateQrTokenTcpRequest): Promise<Table> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const newToken = this.generateQrToken();
    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, { qrToken: newToken });
    if (!updated) {
      throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }
}
