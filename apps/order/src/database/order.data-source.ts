import { createServicePostgresDataSource } from '@common/configuration/type-orm.config';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Session } from '@common/entities/session.entity';
import { join } from 'node:path';

const orderDataSource = createServicePostgresDataSource({
  dedicatedEnvName: 'ORDER_TYPEORM_DATABASE',
  defaultDatabase: 'qrtable_order',
  entities: [Session, Order, OrderItem, Bill, ServiceRequest, OutboxEvent],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});

export default orderDataSource;
