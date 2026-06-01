export type ReportGrain = 'day' | 'week' | 'month';

export interface ReportRange {
  from: string;
  to: string;
}

export interface ReportRequestMeta {
  timezone: string;
  grain: ReportGrain;
  range: ReportRange;
}

export interface ReportSeriesPoint {
  bucket: string;
  label: string;
  value: number;
}
