import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Area } from '@common/entities/area.entity';
import { Bill } from '@common/entities/bill.entity';
import { Session } from '@common/entities/session.entity';
import { Table } from '@common/entities/table.entity';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { BillStatus, PaymentMethod, SessionStatus } from '@einvoice/types';
import { randomUUID } from 'crypto';
import { Socket } from 'net';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AuditPaymentEntity } from '../entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from '../entities/payment-outbox-event.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from '../services/payment.mapper';
import { PaymentOrderGateway } from '../services/payment-order.gateway';
import { PaymentReferenceService } from '../services/payment-reference.service';
import { PaymentSettlementService } from '../services/payment-settlement.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_PAY_COMPLETED_ORDER_BRIDGE'] === '1';
const TENANT_PREFIX = 'phase5-pay-bridge';
const TCP_TIMEOUT_MS = 1000;

type SeedRows = {
  tenantId: string;
  billId: string;
  sessionId: string;
  tableId: string;
};

type ReadinessResult = { ok: boolean; reason?: string };

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-PAY-COMPLETED-ORDER-BRIDGE external-stack integration', () => {
  jest.setTimeout(30000);

  let paymentDataSource: DataSource | null = null;
  let orderDataSource: DataSource | null = null;
  let catalogDataSource: DataSource | null = null;
  let orderClient: ClientProxy | null = null;
  let currentTenantId: string | null = null;

  afterEach(async () => {
    if (paymentDataSource && orderDataSource && catalogDataSource && currentTenantId) {
      await cleanupTenant(paymentDataSource, orderDataSource, catalogDataSource, currentTenantId);
    }
    currentTenantId = null;
  });

  afterAll(async () => {
    await orderClient?.close();
    if (paymentDataSource?.isInitialized) {
      await paymentDataSource.destroy();
    }
    if (orderDataSource?.isInitialized && orderDataSource !== paymentDataSource) {
      await orderDataSource.destroy();
    }
    if (catalogDataSource?.isInitialized && catalogDataSource !== orderDataSource) {
      await catalogDataSource.destroy();
    }
  });

  it('settles payment, emits payment.completed, marks Order bill paid, moves table to cleaning, and tolerates replay', async () => {
    const readiness = await ensureExternalStackReady();
    if (!readiness.ok) {
      throw new Error(
        `[Phase 5 payment completed order bridge not ready] ${readiness.reason ?? 'external stack is not ready'}`,
      );
    }

    paymentDataSource = await createPaymentDataSource();
    orderDataSource = await createOrderDataSource();
    catalogDataSource = await createCatalogDataSource();
    currentTenantId = `${TENANT_PREFIX}-${randomUUID()}`;
    const seed = await seedPayableBill(orderDataSource, catalogDataSource, currentTenantId);
    orderClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: orderTcpOptions(),
    });
    await orderClient.connect();

    const service = buildSettlementService(paymentDataSource, orderClient);

    const settled = await service.confirmCash({
      tenantId: seed.tenantId,
      billId: seed.billId,
      userId: 'phase5-cashier',
      amountReceived: 128_000,
      processId: 'phase5-pay-bridge-1',
    });

    expect(settled.status).toBe('PAID');
    expect(settled.method).toBe(PaymentMethod.CASH);
    expect(settled.paidAmount).toBe(128_000);

    await expect(
      service.confirmCash({
        tenantId: seed.tenantId,
        billId: seed.billId,
        userId: 'phase5-cashier',
        amountReceived: 128_000,
        processId: 'phase5-pay-bridge-duplicate',
      }),
    ).rejects.toThrow('Bill is not pending payment');

    const paymentRows = await paymentDataSource.getRepository(PaymentEntity).findBy({
      tenantId: seed.tenantId,
      billId: seed.billId,
    });
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0]).toMatchObject({
      status: 'PAID',
      method: PaymentMethod.CASH,
      paidAmount: 128_000,
      amountReceived: 128_000,
      changeAmount: 0,
    });

    const outboxRows = await paymentDataSource.getRepository(PaymentOutboxEventEntity).findBy({
      tenantId: seed.tenantId,
      eventType: 'payment.completed',
    });
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]).toMatchObject({
      aggregateId: paymentRows[0].id,
      partitionKey: seed.tenantId,
      status: 'PENDING',
    });
    expect(outboxRows[0].payload).toEqual(
      expect.objectContaining({
        eventType: 'payment.completed',
        tenantId: seed.tenantId,
        billId: seed.billId,
        paymentId: paymentRows[0].id,
        amount: 128_000,
        method: 'CASH',
        correlationId: 'phase5-pay-bridge-1',
      }),
    );

    await replayMarkPaid(orderClient, outboxRows[0]);

    const finalBill = await orderDataSource.getRepository(Bill).findOneByOrFail({
      tenantId: seed.tenantId,
      id: seed.billId,
    });
    expect(finalBill).toMatchObject({
      status: BillStatus.PAID,
      paymentId: paymentRows[0].id,
      paymentMethod: PaymentMethod.CASH,
    });
    expect(finalBill.paidAt).toBeInstanceOf(Date);

    const finalSession = await orderDataSource.getRepository(Session).findOneByOrFail({
      tenantId: seed.tenantId,
      id: seed.sessionId,
    });
    expect(finalSession.status).toBe(SessionStatus.CLOSED);
    expect(finalSession.closedAt).toBeInstanceOf(Date);

    const finalTable = await catalogDataSource.getRepository(Table).findOneByOrFail({
      tenantId: seed.tenantId,
      id: seed.tableId,
    });
    expect(finalTable).toMatchObject({
      status: TABLE_STATUS.CLEANING,
      sessionId: seed.sessionId,
    });

    await expect(
      paymentDataSource.getRepository(PaymentOutboxEventEntity).countBy({
        tenantId: seed.tenantId,
        eventType: 'payment.completed',
      }),
    ).resolves.toBe(1);
  });
});

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_PAY_COMPLETED_ORDER_BRIDGE=1 to opt in' };
  }

  const checks: Array<[string, () => Promise<void>]> = [
    ['Payment PostgreSQL', () => probeDataSource(createPaymentDataSource)],
    ['Order PostgreSQL', () => probeDataSource(createOrderDataSource)],
    ['Catalog PostgreSQL', () => probeDataSource(createCatalogDataSource)],
  ];

  for (const [label, check] of checks) {
    try {
      await check();
    } catch (error) {
      return { ok: false, reason: `${label} not ready: ${readinessMessage(error)}` };
    }
  }

  const orderTcp = await canConnectTcp(orderTcpOptions().host, orderTcpOptions().port);
  if (!orderTcp.ok) {
    return { ok: false, reason: `Order TCP not ready: ${orderTcp.reason ?? 'unknown readiness failure'}` };
  }

  const catalogTcp = await canConnectTcp(catalogTcpOptions().host, catalogTcpOptions().port);
  if (!catalogTcp.ok) {
    return { ok: false, reason: `Catalog TCP not ready: ${catalogTcp.reason ?? 'unknown readiness failure'}` };
  }

  const redis = await canConnectTcp(process.env['REDIS_HOST'] ?? 'redis', Number(process.env['REDIS_PORT'] ?? 6379));
  if (!redis.ok) {
    return {
      ok: false,
      reason: `Redis not ready for Order session close: ${redis.reason ?? 'unknown readiness failure'}`,
    };
  }

  return { ok: true };
}

async function probeDataSource(create: () => Promise<DataSource>): Promise<void> {
  const probe = await create();
  try {
    await probe.query('SELECT 1');
  } finally {
    await probe.destroy();
  }
}

function buildSettlementService(dataSource: DataSource, orderClient: ClientProxy): PaymentSettlementService {
  const paymentRepo = new PaymentRepository(dataSource.getRepository(PaymentEntity));
  const auditRepo = new AuditPaymentRepository(dataSource.getRepository(AuditPaymentEntity));
  const outboxRepo = new PaymentOutboxRepository(dataSource.getRepository(PaymentOutboxEventEntity));
  return new PaymentSettlementService(
    dataSource,
    new PaymentOrderGateway(orderClient as never),
    paymentRepo,
    auditRepo,
    outboxRepo,
    { findByTenantId: jest.fn() } as never,
    new PaymentReferenceService(),
    new PaymentMapper(),
  );
}

function createPaymentDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['PAYMENT_TYPEORM_DATABASE'] ?? 'qrtable_payment', [
    PaymentEntity,
    AuditPaymentEntity,
    PaymentOutboxEventEntity,
  ]).initialize();
}

function createOrderDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['ORDER_TYPEORM_DATABASE'] ?? 'qrtable_order', [
    Session,
    Bill,
  ]).initialize();
}

function createCatalogDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['CATALOG_TYPEORM_DATABASE'] ?? 'qrtable_catalog', [
    Area,
    Table,
  ]).initialize();
}

function createPostgresDataSource(database: string, entities: DataSourceOptions['entities']): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database,
    synchronize: false,
    entities,
  });
}

async function seedPayableBill(
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<SeedRows> {
  await cleanupOrderAndCatalogTenant(orderDataSource, catalogDataSource, tenantId);

  const area = await catalogDataSource.getRepository(Area).save(
    catalogDataSource.getRepository(Area).create({
      tenantId,
      name: `Phase 5 Pay Bridge ${randomUUID()}`,
      sortOrder: 0,
    }),
  );
  const table = await catalogDataSource.getRepository(Table).save(
    catalogDataSource.getRepository(Table).create({
      tenantId,
      areaId: area.id,
      name: 'Phase 5 Bridge Table',
      capacity: 2,
      status: TABLE_STATUS.BILLING,
      qrToken: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      sessionId: null,
    }),
  );

  const now = new Date();
  const session = await orderDataSource.getRepository(Session).save(
    orderDataSource.getRepository(Session).create({
      tenantId,
      tableId: table.id,
      tableName: table.name,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 1,
      currentBillId: null,
      version: 1,
    }),
  );
  table.sessionId = session.id;
  await catalogDataSource.getRepository(Table).save(table);

  const bill = await orderDataSource.getRepository(Bill).save(
    orderDataSource.getRepository(Bill).create({
      tenantId,
      sessionId: session.id,
      orderIds: [],
      subtotal: 127_500,
      total: 128_000,
      roundingAmount: 500,
      paymentMethod: null,
      status: BillStatus.PENDING_PAYMENT,
      closedAt: now,
      paidAt: null,
      paymentId: null,
    }),
  );
  session.currentBillId = bill.id;
  await orderDataSource.getRepository(Session).save(session);

  return { tenantId, billId: bill.id, sessionId: session.id, tableId: table.id };
}

async function replayMarkPaid(orderClient: ClientProxy, row: PaymentOutboxEventEntity): Promise<void> {
  await new PaymentOrderGateway(orderClient as never).markBillPaid({
    tenantId: row.payload.tenantId as string,
    billId: row.payload.billId as string,
    paymentId: row.payload.paymentId as string,
    method: row.payload.method as 'CASH' | 'VIETQR',
    paidAt: row.payload.paidAt as string,
    processId: 'phase5-pay-bridge-replay',
  });
}

async function cleanupTenant(
  paymentDataSource: DataSource,
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<void> {
  await paymentDataSource.getRepository(PaymentOutboxEventEntity).delete({ tenantId });
  await paymentDataSource.getRepository(AuditPaymentEntity).delete({ tenantId });
  await paymentDataSource.getRepository(PaymentEntity).delete({ tenantId });
  await cleanupOrderAndCatalogTenant(orderDataSource, catalogDataSource, tenantId);
}

async function cleanupOrderAndCatalogTenant(
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<void> {
  await orderDataSource.getRepository(Bill).delete({ tenantId });
  await orderDataSource.getRepository(Session).delete({ tenantId });
  await catalogDataSource.getRepository(Table).delete({ tenantId });
  await catalogDataSource.getRepository(Area).delete({ tenantId });
}

function orderTcpOptions(): { host: string; port: number } {
  return {
    host: process.env['TCP_ORDER_SERVICE_HOST'] ?? process.env['ORDER_SERVICE_HOST'] ?? 'localhost',
    port: Number(process.env[TCP_SERVICES.ORDER_SERVICE + '_PORT'] ?? 3201),
  };
}

function catalogTcpOptions(): { host: string; port: number } {
  return {
    host: process.env['TCP_CATALOG_SERVICE_HOST'] ?? process.env['CATALOG_SERVICE_HOST'] ?? 'localhost',
    port: Number(process.env[TCP_SERVICES.CATALOG_SERVICE + '_PORT'] ?? 3205),
  };
}

function canConnectTcp(host: string, port: number): Promise<ReadinessResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: ReadinessResult) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${readinessMessage(error)}` }));
    socket.connect(port, host);
  });
}

function readinessMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
