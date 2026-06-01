export type ReportGrain = 'day' | 'week' | 'month';

export const DEFAULT_REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DEFAULT_REPORT_RANGE_DAYS = 7;
export const MAX_REPORT_RANGE_DAYS = 90;
export const DEFAULT_REPORT_LIMIT = 10;
export const MAX_REPORT_LIMIT = 20;

export type ReportRangeInput = {
  from?: string;
  to?: string;
  grain?: ReportGrain;
  timezone?: string;
  limit?: number;
};

export type NormalizedReportRange = {
  timezone: string;
  grain: ReportGrain;
  limit: number;
  range: { from: string; to: string };
  fromUtc: Date;
  toUtc: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class ReportRangeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRangeValidationError';
  }
}

export function normalizeReportRange(input: ReportRangeInput = {}, now: Date = new Date()): NormalizedReportRange {
  const timezone = input.timezone?.trim() || DEFAULT_REPORT_TIMEZONE;
  const grain = input.grain ?? 'day';
  if (!['day', 'week', 'month'].includes(grain)) {
    throw new ReportRangeValidationError('grain must be day, week, or month');
  }

  const toUtc = input.to ? parseReportInstant(input.to, 'to') : now;
  const fromUtc = input.from
    ? parseReportInstant(input.from, 'from')
    : new Date(toUtc.getTime() - DEFAULT_REPORT_RANGE_DAYS * MS_PER_DAY);

  if (Number.isNaN(fromUtc.getTime()) || Number.isNaN(toUtc.getTime())) {
    throw new ReportRangeValidationError('from and to must be valid dates');
  }
  if (toUtc < fromUtc) {
    throw new ReportRangeValidationError('to must be greater than or equal to from');
  }

  const spanDays = (toUtc.getTime() - fromUtc.getTime()) / MS_PER_DAY;
  if (spanDays > MAX_REPORT_RANGE_DAYS) {
    throw new ReportRangeValidationError(`date range must not exceed ${MAX_REPORT_RANGE_DAYS} days`);
  }

  const limit = Math.min(MAX_REPORT_LIMIT, Math.max(1, input.limit ?? DEFAULT_REPORT_LIMIT));

  return {
    timezone,
    grain,
    limit,
    range: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
    fromUtc,
    toUtc,
  };
}

function parseReportInstant(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ReportRangeValidationError(`${field} must be a valid ISO date or datetime`);
  }
  return parsed;
}
