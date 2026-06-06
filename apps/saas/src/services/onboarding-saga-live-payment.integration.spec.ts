import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import {
  SAAS_EVENTS,
  SubscriptionStatus,
  TenantPaymentConnectionStatus,
  TenantStatus,
} from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { DataSource, type DataSourceOptions, type Repository } from 'typeorm';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SaasOutboxRepository } from '../repositories/saas-outbox.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { OnboardingSagaService } from './onboarding-saga.service';
import { SubscriptionService } from './subscription.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT'] === '1';
const TCP_TIMEOUT_MS = 5_000;
const READINESS_TIMEOUT_MS = 1_000;
const OWNER_USER_ID = '22222222-2222-4222-8222-222222222222';

type Harness = {
  saasDataSource: DataSource;
  paymentDataSource: DataSource;
  paymentClient: ClientProxy;
  tenantRepo: Repository<Tenant>;
  planRepo: Repository<PricingPlan>;
  subscriptionRepo: Repository<Subscription>;
  outboxRepo: Repository<SaasOutboxEvent>;
};

type ReadinessResult = { ok: boolean; reason?: string };

type ContractClients = {
  authorizerClient: { send: jest.Mock };
  userClient: { send: jest.Mock };
};

type PaymentSettingsRow = {
  tenant_id: string;
  cash_enabled: boolean;
  vietqr_enabled: boolean;
  connection_status: TenantPaymentConnectionStatus;
};

type PaymentSettingsEnvelope = {
  data?: {
    tenantId: string;
    cashEnabled: boolean;
    vietqrEnabled: boolean;
    connectionStatus: TenantPaymentConnectionStatus;
  };
  statusCode: number;
  error?: string;
};

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-SAAS-ONBOARDING-SAGA live Payment TCP integration', () => {
  jest.setTimeout(45000);

  let harness: Harness | null = null;
  let currentTenantId: string | null = null;
  let currentSlug: string | null = null;
  let currentPlanCode: string | null = null;

  afterEach(async () => {
    if (harness) {
      if (currentTenantId) {
        await cleanupPaymentSettings(harness, currentTenantId);
        await cleanupTenant(harness, currentTenantId);
      }
      if (currentSlug) {
        await cleanupSlug(harness, currentSlug);
      }
      if (currentPlanCode) {
        await cleanupPlan(harness, currentPlanCode);
      }
    }
    currentTenantId = null;
    currentSlug = null;
    currentPlanCode = null;
  });

  afterAll(async () => {
    if (harness?.paymentClient) {
      await harness.paymentClient.close();
    }
    if (harness?.paymentDataSource.isInitialized) {
      await harness.paymentDataSource.destroy();
    }
    if (harness?.saasDataSource.isInitialized) {
      await harness.saasDataSource.destroy();
    }
  });

  it('persists SaaS onboarding state and creates exactly one Payment settings row through live TCP', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const planCode = nextPlanCode();
    const processId = `phase5-saas-live-payment-${randomUUID()}`;
    const slug = `phase5-live-payment-${randomUUID()}`;
    currentPlanCode = planCode;
    currentSlug = slug;
    await seedPlan(h, planCode);
    const contractClients = createContractClients(OWNER_USER_ID);
    const service = createService(h, contractClients);

    const result = await service.onboard({
      tenantName: 'Phase 5 Live Payment',
      slug,
      ownerEmail: 'phase5-live-payment@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Phase',
      ownerLastName: 'Five',
      planCode,
      processId,
    });
    currentTenantId = result.tenant.id;

    await expect(h.tenantRepo.findOneByOrFail({ id: result.tenant.id })).resolves.toMatchObject({
      slug,
      status: TenantStatus.ACTIVE,
      isActive: true,
    });
    await expect(h.subscriptionRepo.findOneByOrFail({ tenantId: result.tenant.id })).resolves.toMatchObject({
      status: SubscriptionStatus.ACTIVE,
      source: 'INITIAL_ONBOARDING',
      planCodeSnapshot: planCode,
    });
    await expect(h.outboxRepo.findOneByOrFail({ tenantId: result.tenant.id })).resolves.toMatchObject({
      eventType: SAAS_EVENTS.TENANT_CREATED,
      status: 'PENDING',
      payload: expect.objectContaining({
        tenantId: result.tenant.id,
        slug,
        ownerUserId: OWNER_USER_ID,
        planCode,
        correlationId: processId,
      }),
    });

    await replayCreateEmptyPaymentSettings(h.paymentClient, result.tenant.id, `${processId}-replay`);

    const settingsRows = await findPaymentSettingsRows(h, result.tenant.id);
    expect(settingsRows).toEqual([
      expect.objectContaining({
        tenant_id: result.tenant.id,
        cash_enabled: true,
        vietqr_enabled: false,
        connection_status: TenantPaymentConnectionStatus.NOT_CONNECTED,
      }),
    ]);
    expect(contractClients.authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: result.tenant.id, tenantSlug: slug, roleNames: ['OWNER'] }),
        processId,
      }),
    );
    expect(contractClients.userClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: result.tenant.id, userId: OWNER_USER_ID }),
        processId,
      }),
    );
  });

  async function getHarness(): Promise<Harness> {
    if (harness) {
      return harness;
    }
    harness = await createHarness();
    return harness;
  }
});

async function ensureHarnessReady(): Promise<void> {
  const readiness = await ensureExternalStackReady();
  if (!readiness.ok) {
    throw new Error(`[Phase 5 SaaS live Payment integration not ready] ${readiness.reason}`);
  }
}

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 to opt in' };
  }

  try {
    const saasProbe = await createSaasDataSource();
    await saasProbe.query('SELECT 1');
    await saasProbe.destroy();

    const paymentProbe = await createPaymentDataSource();
    await paymentProbe.query('SELECT 1');
    const tableRows = (await paymentProbe.query(
      "SELECT to_regclass('tenant_payment_settings') AS table_name",
    )) as Array<{ table_name: string | null }>;
    await paymentProbe.destroy();
    if (!tableRows[0]?.table_name) {
      return { ok: false, reason: 'Payment table tenant_payment_settings is not migrated' };
    }
  } catch (error) {
    return { ok: false, reason: `PostgreSQL not ready: ${readinessMessage(error)}` };
  }

  const paymentTcp = await canConnectTcp(paymentTcpOptions().host, paymentTcpOptions().port);
  if (!paymentTcp.ok) {
    return { ok: false, reason: `Payment TCP not ready: ${paymentTcp.reason ?? 'unknown readiness failure'}` };
  }

  return { ok: true };
}

async function createHarness(): Promise<Harness> {
  const saasDataSource = await createSaasDataSource();
  const paymentDataSource = await createPaymentDataSource();
  const paymentClient = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: paymentTcpOptions(),
  });
  await paymentClient.connect();

  return {
    saasDataSource,
    paymentDataSource,
    paymentClient,
    tenantRepo: saasDataSource.getRepository(Tenant),
    planRepo: saasDataSource.getRepository(PricingPlan),
    subscriptionRepo: saasDataSource.getRepository(Subscription),
    outboxRepo: saasDataSource.getRepository(SaasOutboxEvent),
  };
}

function createSaasDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['SAAS_TYPEORM_DATABASE'] ?? 'qrtable_saas', [
    Tenant,
    PricingPlan,
    Subscription,
    SaasOutboxEvent,
  ]).initialize();
}

function createPaymentDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['PAYMENT_TYPEORM_DATABASE'] ?? 'qrtable_payment', []).initialize();
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

function createService(harness: Harness, contractClients: ContractClients): OnboardingSagaService {
  const planRepository = new PricingPlanRepository(harness.planRepo);
  const subscriptionRepository = new SubscriptionRepository(harness.subscriptionRepo);
  const subscriptionService = new SubscriptionService(planRepository, subscriptionRepository);
  return new OnboardingSagaService(
    new TenantRepository(harness.tenantRepo),
    subscriptionService,
    contractClients.authorizerClient as unknown as TcpClient,
    contractClients.userClient as unknown as TcpClient,
    createTimedPaymentClient(harness.paymentClient),
    new SaasOutboxRepository(harness.outboxRepo),
  );
}

function createTimedPaymentClient(client: ClientProxy): TcpClient {
  const timedClient: TcpClient = {
    send: (pattern, data) => client.send(pattern, data).pipe(timeout(TCP_TIMEOUT_MS)),
    emit: (pattern, data) => client.emit(pattern, data).pipe(timeout(TCP_TIMEOUT_MS)),
  };
  return timedClient;
}

function createContractClients(ownerUserId: string): ContractClients {
  return {
    authorizerClient: {
      send: jest.fn((message: string) => {
        if (message === TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER) {
          return tcpResponse({ data: { userId: ownerUserId } });
        }
        if (message === TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER) {
          return tcpResponse({ data: { userId: ownerUserId, enabled: false } });
        }
        return tcpResponse({ data: null });
      }),
    },
    userClient: {
      send: jest.fn(() => tcpResponse({ data: { userId: ownerUserId } })),
    },
  };
}

function tcpResponse<T>(value: T): { toPromise: () => Promise<T> } {
  return { toPromise: () => Promise.resolve(value) };
}

async function replayCreateEmptyPaymentSettings(
  paymentClient: ClientProxy,
  tenantId: string,
  processId: string,
): Promise<void> {
  const response = await firstValueFrom(
    paymentClient
      .send<PaymentSettingsEnvelope>(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY, {
        data: { tenantId },
        processId,
      })
      .pipe(timeout(TCP_TIMEOUT_MS)),
  );

  expect(response).toMatchObject({
    data: expect.objectContaining({
      tenantId,
      cashEnabled: true,
      vietqrEnabled: false,
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
    }),
    statusCode: 200,
  });
}

async function findPaymentSettingsRows(harness: Harness, tenantId: string): Promise<PaymentSettingsRow[]> {
  return (await harness.paymentDataSource.query(
    `
      SELECT tenant_id, cash_enabled, vietqr_enabled, connection_status
      FROM tenant_payment_settings
      WHERE tenant_id = $1
      ORDER BY created_at ASC
    `,
    [tenantId],
  )) as PaymentSettingsRow[];
}

async function seedPlan(harness: Harness, code: string): Promise<PricingPlan> {
  await cleanupPlan(harness, code);
  return harness.planRepo.save(
    harness.planRepo.create({
      code,
      name: `Phase 5 Live Payment ${code}`,
      billingPeriod: 'MONTHLY',
      priceVnd: 0,
      maxTables: 12,
      maxStaff: 4,
      maxOrdersPerDay: 500,
      features: ['phase5-live-payment'],
      isActive: true,
      displayOrder: 0,
    }),
  );
}

async function cleanupTenant(harness: Harness, tenantId: string): Promise<void> {
  await harness.outboxRepo.delete({ tenantId });
  await harness.subscriptionRepo.delete({ tenantId });
  await harness.tenantRepo.delete({ id: tenantId });
}

async function cleanupSlug(harness: Harness, slug: string): Promise<void> {
  const tenant = await harness.tenantRepo.findOneBy({ slug });
  if (tenant) {
    await cleanupPaymentSettings(harness, tenant.id);
    await cleanupTenant(harness, tenant.id);
  }
}

async function cleanupPlan(harness: Harness, code: string): Promise<void> {
  await harness.subscriptionRepo.delete({ planCodeSnapshot: code });
  await harness.planRepo.delete({ code });
}

async function cleanupPaymentSettings(harness: Harness, tenantId: string): Promise<void> {
  await harness.paymentDataSource.query('DELETE FROM tenant_payment_settings WHERE tenant_id = $1', [tenantId]);
}

function paymentTcpOptions(): { host: string; port: number } {
  return {
    host: process.env['TCP_PAYMENT_SERVICE_HOST'] ?? process.env['PAYMENT_SERVICE_HOST'] ?? 'localhost',
    port: Number(process.env[`${TCP_SERVICES.PAYMENT_SERVICE}_PORT`] ?? 3208),
  };
}

function canConnectTcp(host: string, port: number): Promise<ReadinessResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: ReadinessResult) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(READINESS_TIMEOUT_MS);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${readinessMessage(error)}` }));
    socket.connect(port, host);
  });
}

function nextPlanCode(): string {
  return `P5LVP${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function readinessMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
