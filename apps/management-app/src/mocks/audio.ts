const STORAGE_KEY = 'qrtable-mock-sound-enabled';

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function ensureUnlocked() {
  if (typeof document === 'undefined' || unlocked) return;
  const once = () => {
    void getCtx()?.resume();
    unlocked = true;
    document.removeEventListener('click', once);
  };
  document.addEventListener('click', once, { once: true });
}

export function setSoundEnabled(b: boolean) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, b ? '1' : '0');
}

export function isSoundEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== '0';
}

function playBeep(freq: number, durationMs: number, gainValue = 0.08) {
  if (!isSoundEnabled()) return;
  ensureUnlocked();
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(c.destination);
  const now = c.currentTime;
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function playBell() {
  playBeep(880, 120, 0.1);
}

export function playTap() {
  playBeep(520, 80, 0.08);
}

export function playAlert() {
  playBeep(660, 180, 0.09);
  setTimeout(() => playBeep(880, 180, 0.09), 200);
}
