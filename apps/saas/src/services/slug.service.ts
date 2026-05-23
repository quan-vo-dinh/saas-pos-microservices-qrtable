import { RESERVED_TENANT_SLUGS } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  generate(value: string): string {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  assertAllowed(slug: string): void {
    if (!slug || RESERVED_TENANT_SLUGS.includes(slug as (typeof RESERVED_TENANT_SLUGS)[number])) {
      throw new BusinessException(ErrorCode.SAAS_SLUG_RESERVED, HttpStatus.BAD_REQUEST);
    }
  }

  async generateUnique(raw: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
    const base = this.generate(raw);
    this.assertAllowed(base);
    let candidate = base;
    let suffix = 2;
    while (await exists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
