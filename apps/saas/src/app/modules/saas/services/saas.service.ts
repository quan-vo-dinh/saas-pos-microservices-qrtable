import { BadRequestException, Injectable } from '@nestjs/common';
import { Tenant } from '@common/entities/tenant.entity';
import { SaasRepository } from '../repositories/saas.repository';

@Injectable()
export class SaasService {
  constructor(private readonly saasRepository: SaasRepository) {}

  async create(data: Partial<Tenant>) {
    const name = data.name?.trim();

    if (!name) {
      throw new BadRequestException('name is required');
    }

    const slug = (data.slug || name).trim().toLowerCase().replace(/\s+/g, '-');
    const exists = await this.saasRepository.existsBySlug(slug);
    if (exists) {
      throw new BadRequestException('Tenant already exists');
    }

    return this.saasRepository.create({
      ...data,
      name,
      slug,
    });
  }

  getList() {
    return this.saasRepository.findAll();
  }
}
