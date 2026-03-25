/** React Query default options. */
export const QUERY_CONFIG = {
  STALE_TIME: 60_000,
  REFETCH_ON_WINDOW_FOCUS: false,
} as const;

/** Responsive breakpoints (px). */
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
} as const;

/** Default pagination settings. */
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
