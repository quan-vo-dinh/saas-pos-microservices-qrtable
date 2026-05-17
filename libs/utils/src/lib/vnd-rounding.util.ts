export type VndRoundingSnapshot = {
  rawTotal: number;
  roundedTotal: number;
  roundingDelta: number;
};

const VND_ROUNDING_UNIT = 1_000;

export function buildVndRoundingSnapshot(rawTotal: number): VndRoundingSnapshot {
  assertNonNegativeIntegerVnd('rawTotal', rawTotal);
  const roundedTotal = Math.ceil(rawTotal / VND_ROUNDING_UNIT) * VND_ROUNDING_UNIT;
  return {
    rawTotal,
    roundedTotal,
    roundingDelta: roundedTotal - rawTotal,
  };
}

export function assertValidVndRoundingSnapshot(snapshot: VndRoundingSnapshot): void {
  assertNonNegativeIntegerVnd('rawTotal', snapshot.rawTotal);
  assertNonNegativeIntegerVnd('roundedTotal', snapshot.roundedTotal);
  assertNonNegativeIntegerVnd('roundingDelta', snapshot.roundingDelta);

  const expected = buildVndRoundingSnapshot(snapshot.rawTotal);
  if (snapshot.roundedTotal !== expected.roundedTotal || snapshot.roundingDelta !== expected.roundingDelta) {
    throw new RangeError(
      `Inconsistent VND rounding snapshot for rawTotal ${snapshot.rawTotal}: expected roundedTotal ${expected.roundedTotal} and roundingDelta ${expected.roundingDelta}`,
    );
  }
}

function assertNonNegativeIntegerVnd(field: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative integer VND amount`);
  }
}
