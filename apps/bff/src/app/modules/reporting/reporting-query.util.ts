import { ReportRangeQueryDto } from '@common/interfaces/gateway/report';
import {
  normalizeReportRange,
  ReportRangeValidationError,
  type NormalizedReportRange,
} from '@common/utils/report-range.util';
import { BadRequestException } from '@nestjs/common';

export type TenantReportTcpPayload = {
  tenantId: string;
  timezone: string;
  grain: NormalizedReportRange['grain'];
  from: string;
  to: string;
  limit: number;
};

export function buildTenantReportTcpPayload(tenantId: string, query: ReportRangeQueryDto): TenantReportTcpPayload {
  try {
    const normalized = normalizeReportRange(query);
    return {
      tenantId,
      timezone: normalized.timezone,
      grain: normalized.grain,
      from: normalized.range.from,
      to: normalized.range.to,
      limit: normalized.limit,
    };
  } catch (error) {
    if (error instanceof ReportRangeValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

export type PlatformReportTcpPayload = {
  timezone: string;
  grain: NormalizedReportRange['grain'];
  from: string;
  to: string;
  limit: number;
};

export function buildPlatformReportTcpPayload(query: ReportRangeQueryDto): PlatformReportTcpPayload {
  try {
    const normalized = normalizeReportRange(query);
    return {
      timezone: normalized.timezone,
      grain: normalized.grain,
      from: normalized.range.from,
      to: normalized.range.to,
      limit: normalized.limit,
    };
  } catch (error) {
    if (error instanceof ReportRangeValidationError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
