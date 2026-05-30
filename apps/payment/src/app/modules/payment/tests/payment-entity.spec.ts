import { AuditPaymentEntity } from '../entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from '../entities/payment-outbox-event.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('Payment persistence entities', () => {
  it('exposes stable table names', () => {
    expect(Reflect.getMetadata('typeorm:entity-schema', PaymentEntity)).toBeUndefined();
    expect(PaymentEntity.name).toBe('PaymentEntity');
    expect(AuditPaymentEntity.name).toBe('AuditPaymentEntity');
    expect(PaymentOutboxEventEntity.name).toBe('PaymentOutboxEventEntity');
  });

  it('keeps bill references globally unique for tenant-safe SePay webhook matching', () => {
    const billReferenceIndex = getMetadataArgsStorage().indices.find((index) => {
      if (index.target !== PaymentEntity) {
        return false;
      }
      const columns = typeof index.columns === 'function' ? [] : index.columns;
      return Array.isArray(columns) && columns.length === 1 && columns[0] === 'billReference';
    });

    expect(billReferenceIndex?.unique).toBe(true);
  });

  it('registers PostgreSQL check constraints on payment aggregate roots', () => {
    const { checks } = getMetadataArgsStorage();
    expect(checks.filter((c) => c.target === PaymentEntity).length).toBe(7);
    expect(checks.filter((c) => c.target === AuditPaymentEntity).length).toBe(2);
  });
});
