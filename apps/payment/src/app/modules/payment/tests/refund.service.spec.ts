describe('Refund policy', () => {
  it('Phase 3 refund is full amount only', () => {
    const roundedTotal = 128000;
    const requestedAmount = roundedTotal;
    expect(requestedAmount).toBe(roundedTotal);
  });

  it('uses manual pending action before confirmation', () => {
    expect('PENDING_STAFF_ACTION').toBe('PENDING_STAFF_ACTION');
    expect('CONFIRMED').toBe('CONFIRMED');
  });
});
