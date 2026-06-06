import { createServicePostgresDataSource } from '@common/configuration/type-orm.config';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { join } from 'node:path';

const saasDataSource = createServicePostgresDataSource({
  dedicatedEnvName: 'SAAS_TYPEORM_DATABASE',
  defaultDatabase: 'qrtable_saas',
  entities: [Tenant, PricingPlan, Subscription, SubscriptionInvoice, SaasOutboxEvent],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});

export default saasDataSource;
