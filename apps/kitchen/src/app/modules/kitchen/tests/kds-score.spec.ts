import { queueScore } from '../utils/kds-score';

describe('KDS queue score', () => {
  it('sorts priority tickets before normal FIFO tickets', () => {
    const confirmedAtMs = Date.parse('2026-05-07T10:00:00.000Z');

    expect(queueScore(false, confirmedAtMs)).toBe(10_000_000_000_000 + confirmedAtMs);
    expect(queueScore(true, confirmedAtMs)).toBe(confirmedAtMs);
    expect(queueScore(true, confirmedAtMs)).toBeLessThan(queueScore(false, confirmedAtMs - 60_000));
  });
});
