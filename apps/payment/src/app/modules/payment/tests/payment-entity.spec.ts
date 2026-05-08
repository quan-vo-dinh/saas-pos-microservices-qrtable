import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import { AuditPaymentEntity } from '../entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from '../entities/payment-outbox-event.entity';

describe('Payment persistence entities', () => {
  it('exposes stable table names', () => {
    expect(Reflect.getMetadata('typeorm:entity-schema', PaymentEntity)).toBeUndefined();
    expect(PaymentEntity.name).toBe('PaymentEntity');
    expect(RefundEntity.name).toBe('RefundEntity');
    expect(AuditPaymentEntity.name).toBe('AuditPaymentEntity');
    expect(PaymentOutboxEventEntity.name).toBe('PaymentOutboxEventEntity');
  });
});
