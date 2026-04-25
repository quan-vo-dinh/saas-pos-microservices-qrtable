import type { KDSStation } from '@/mocks/kds-ticket';

const slaKey = (s: KDSStation) => `qrtable-kds-sla-cap-min-${s}`;
const fontKey = (s: KDSStation) => `qrtable-kds-font-px-${s}`;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function readKdsSlaCapMinutes(station: KDSStation): number {
  if (typeof window === 'undefined') return 15;
  const raw = window.localStorage.getItem(slaKey(station));
  const n = raw == null ? 15 : Number(raw);
  if (!Number.isFinite(n)) return 15;
  return clamp(Math.round(n), 5, 20);
}

export function writeKdsSlaCapMinutes(station: KDSStation, minutes: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(slaKey(station), String(clamp(Math.round(minutes), 5, 20)));
}

export function readKdsFontPx(station: KDSStation): number {
  if (typeof window === 'undefined') return 18;
  const raw = window.localStorage.getItem(fontKey(station));
  const n = raw == null ? 18 : Number(raw);
  if (!Number.isFinite(n)) return 18;
  return clamp(Math.round(n), 14, 22);
}

export function writeKdsFontPx(station: KDSStation, px: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(fontKey(station), String(clamp(Math.round(px), 14, 22)));
}

/** Shorter SLA window for band / SLA watch (amber appears earlier when cap is low). */
export function effectiveSlaSeconds(ticketSlaSeconds: number, capMinutes: number): number {
  return Math.min(Math.max(1, ticketSlaSeconds), Math.max(60, capMinutes * 60));
}
