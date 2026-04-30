import { Session } from '@common/entities/session.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SessionRepository {
  constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }
}
