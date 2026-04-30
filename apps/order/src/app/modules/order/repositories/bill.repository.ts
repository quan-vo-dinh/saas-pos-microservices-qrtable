import { Bill } from '@common/entities/bill.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BillRepository {
  constructor(@InjectRepository(Bill) private readonly repo: Repository<Bill>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Bill | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findBySessionIdAndTenant(sessionId: string, tenantId: string): Promise<Bill | null> {
    return this.repo.findOne({ where: { sessionId, tenantId } });
  }
}
