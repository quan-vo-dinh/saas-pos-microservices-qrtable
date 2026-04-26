'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 10_000;

/** Shared clock: one interval for all subscribers; snapshot is stable between ticks. */
let clientNowMs = 0;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function ensureClockRunning() {
  if (intervalId !== null) return;
  clientNowMs = Date.now();
  intervalId = setInterval(() => {
    clientNowMs = Date.now();
    for (const l of listeners) l();
  }, TICK_MS);
}

function subscribePosClock(onStoreChange: () => void) {
  ensureClockRunning();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getPosClockSnapshot() {
  return clientNowMs;
}

function getPosClockServerSnapshot() {
  return 0;
}

/**
 * Monotonic wall time for POS “live” math. SSR + first hydration frame use `0` so
 * derived text matches; after subscribe runs, snapshot jumps to real `Date.now()`.
 * Avoids `getSnapshot: () => Date.now()` (not pure → update loops / Strict Mode issues).
 */
export function useNowMs() {
  return useSyncExternalStore(subscribePosClock, getPosClockSnapshot, getPosClockServerSnapshot);
}

export function waitMinutes(createdAt: string, nowMs: number) {
  if (!nowMs) {
    return 0;
  }
  return (nowMs - new Date(createdAt).getTime()) / 60_000;
}
