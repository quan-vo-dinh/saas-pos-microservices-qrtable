import { createServicePostgresDataSource } from '@common/configuration/type-orm.config';
import { join } from 'node:path';
import { AuditPaymentEntity } from '../app/modules/payment/entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from '../app/modules/payment/entities/payment-outbox-event.entity';
import { PaymentEntity } from '../app/modules/payment/entities/payment.entity';
import { TenantPaymentSettingsEntity } from '../app/modules/payment/entities/tenant-payment-settings.entity';

const paymentDataSource = createServicePostgresDataSource({
  dedicatedEnvName: 'PAYMENT_TYPEORM_DATABASE',
  defaultDatabase: 'qrtable_payment',
  entities: [PaymentEntity, AuditPaymentEntity, PaymentOutboxEventEntity, TenantPaymentSettingsEntity],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});

export default paymentDataSource;
