import type { ReportRangeQuery } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function buildDefaultReportQuery(): ReportRangeQuery {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * MS_PER_DAY);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    grain: 'day',
    timezone: 'Asia/Ho_Chi_Minh',
    limit: 10,
  };
}
