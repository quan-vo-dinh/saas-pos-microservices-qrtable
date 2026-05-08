import { PaymentReferenceService } from '../services/payment-reference.service';

describe('PaymentReferenceService', () => {
  const service = new PaymentReferenceService();

  it('creates QRTBL reference from first 8 bill id chars without dashes', () => {
    expect(service.createBillReference('b1a2c3d4-1111-2222-3333-444455556666')).toBe('QRTBLB1A2C3D4');
  });

  it('extracts reference from code first', () => {
    expect(service.extractBillReference({ code: 'QRTBLABC12345', content: 'QRTBLZZZZ9999' })).toBe('QRTBLABC12345');
  });

  it('falls back to content', () => {
    expect(service.extractBillReference({ code: null, content: 'Thanh toan QRTBLABC12345 ban 5' })).toBe(
      'QRTBLABC12345',
    );
  });

  it('returns null when no reference is present', () => {
    expect(service.extractBillReference({ code: null, content: 'khong co ma' })).toBeNull();
  });

  it('builds SePay QR URL with encoded description', () => {
    expect(
      service.buildQrUrl({
        account: '9332770502',
        bank: 'Vietcombank',
        amount: 128000,
        description: 'QRTBLABC12345',
      }),
    ).toBe('https://qr.sepay.vn/img?acc=9332770502&bank=Vietcombank&amount=128000&des=QRTBLABC12345');
  });
});
