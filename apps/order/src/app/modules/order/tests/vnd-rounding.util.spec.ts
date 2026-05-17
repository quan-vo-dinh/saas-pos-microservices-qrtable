import { buildVndRoundingSnapshot } from '@common/utils/vnd-rounding.util';

describe('VND rounding policy', () => {
  it.each([
    [0, 0, 0],
    [1, 1_000, 999],
    [999, 1_000, 1],
    [1_000, 1_000, 0],
    [1_001, 2_000, 999],
    [127_500, 128_000, 500],
  ])('rounds rawTotal %i to roundedTotal %i and roundingDelta %i', (rawTotal, roundedTotal, roundingDelta) => {
    expect(buildVndRoundingSnapshot(rawTotal)).toEqual({
      rawTotal,
      roundedTotal,
      roundingDelta,
    });
  });

  it('rejects negative raw totals at the policy boundary', () => {
    expect(() => buildVndRoundingSnapshot(-1)).toThrow('rawTotal must be a non-negative integer VND amount');
  });
});
