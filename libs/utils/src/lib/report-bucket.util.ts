import type { ReportGrain } from './report-range.util';

export function formatBucketLabel(bucket: string, grain: ReportGrain): string {
  if (grain === 'day') {
    return bucket;
  }
  if (grain === 'week') {
    return `Tuần ${bucket}`;
  }
  return bucket;
}

export function pgBucketExpression(column: string, grain: ReportGrain, timezone: string): string {
  const tzExpr = `(${column} AT TIME ZONE 'UTC' AT TIME ZONE '${timezone.replace(/'/g, "''")}')`;
  if (grain === 'month') {
    return `to_char(date_trunc('month', ${tzExpr}), 'YYYY-MM')`;
  }
  if (grain === 'week') {
    return `to_char(date_trunc('week', ${tzExpr}), 'IYYY-"W"IW')`;
  }
  return `to_char(date_trunc('day', ${tzExpr}), 'YYYY-MM-DD')`;
}
