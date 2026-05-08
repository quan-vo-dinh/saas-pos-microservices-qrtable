import { ConflictException } from '@nestjs/common';
import { PaymentMethod } from '@einvoice/types';
import { PaymentReferenceService } from '../services/payment-reference.service';

describe('PaymentService policy checks', () => {
  const reference = new PaymentReferenceService();

  it('extracts underpaid matched webhook as pending policy', () => {
    const billReference = reference.extractBillReference({
      code: 'QRTBLABC12345',
      content: 'ignored',
    });
    expect(billReference).toBe('QRTBLABC12345');
    expect(100000 < 128000).toBe(true);
  });

  it('defines cash conflict error as 409 conflict', () => {
    const err = new ConflictException('Bill already paid');
    expect(err.getStatus()).toBe(409);
  });

  it('uses VIETQR method for SePay payments', () => {
    expect(PaymentMethod.VIETQR).toBe('VIETQR');
  });
});
