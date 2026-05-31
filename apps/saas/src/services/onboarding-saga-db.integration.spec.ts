import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SAAS_EVENTS, SubscriptionStatus, TenantStatus } from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { randomUUID } from 'node:crypto';
import { DataSource, type DataSourceOptions, type Repository } from 'typeorm';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SaasOutboxRepository } from '../repositories/saas-outbox.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { OnboardingSagaService } from './onboarding-saga.service';
import { SubscriptionService } from './subscription.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION'] === '1';
const OWNER_USER_ID = '11111111-1111-4111-8111-111111111111';

type Harness = {
  dataSource: DataSource;
  tenantRepo: Repository<Tenant>;
  planRepo: Repository<PricingPlan>;
  subscriptionRepo: Repository<Subscription>;
  outboxRepo: Repository<SaasOutboxEvent>;
};

type ReadinessResult = { ok: boolean; reason?: string };

type TcpClients = {
  authorizerClient: { send: jest.Mock };
  userClient: { send: jest.Mock };
  paymentClient: { send: jest.Mock };
};

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-SAAS-ONBOARDING-SAGA PostgreSQL integration', () => {
  jest.setTimeout(30000);

  let harness: Harness | null = null;
  let currentTenantId: string | null = null;
  let currentSlug: string | null = null;
  let currentPlanCode: string | null = null;

  afterEach(async () => {
    if (harness) {
      if (currentTenantId) {
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
    if (harness?.dataSource.isInitialized) {
      await harness.dataSource.destroy();
    }
  });

  it('persists tenant, initial subscription, payment-settings call, and tenant.created outbox on success', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const planCode = nextPlanCode();
    const slug = `phase5-onboarding-success-${randomUUID()}`;
    currentPlanCode = planCode;
    currentSlug = slug;
    await seedPlan(h, planCode);
    const clients = createTcpClients();
    const service = createService(h, clients);

    const result = await service.onboard({
      tenantName: 'Phase 5 Onboarding Success',
      slug,
      ownerEmail: 'phase5-success@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Phase',
      ownerLastName: 'Five',
      planCode,
      processId: 'phase5-onboarding-success',
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
        correlationId: 'phase5-onboarding-success',
      }),
    });
    expect(clients.authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: result.tenant.id, tenantSlug: slug, roleNames: ['OWNER'] }),
        processId: 'phase5-onboarding-success',
      }),
    );
    expect(clients.userClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: result.tenant.id, userId: OWNER_USER_ID }),
        processId: 'phase5-onboarding-success',
      }),
    );
    expect(clients.paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY,
      expect.objectContaining({ data: { tenantId: result.tenant.id }, processId: 'phase5-onboarding-success' }),
    );
  });

  it('compensates tenant and Keycloak owner when profile upsert fails before subscription assignment', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const planCode = nextPlanCode();
    const slug = `phase5-onboarding-profile-fail-${randomUUID()}`;
    currentPlanCode = planCode;
    currentSlug = slug;
    await seedPlan(h, planCode);
    const clients = createTcpClients({ userError: new Error('user profile unavailable') });
    const service = createService(h, clients);

    await expect(
      service.onboard({
        tenantName: 'Phase 5 Onboarding Profile Failure',
        slug,
        ownerEmail: 'phase5-profile-fail@example.com',
        ownerPassword: 'Password123!',
        planCode,
        processId: 'phase5-onboarding-profile-fail',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_ONBOARDING_FAILED });

    const tenantId = extractCreatedTenantId(clients);
    currentTenantId = tenantId;
    await expect(h.tenantRepo.findOneBy({ id: tenantId })).resolves.toBeNull();
    await expect(h.subscriptionRepo.countBy({ tenantId })).resolves.toBe(0);
    await expect(h.outboxRepo.countBy({ tenantId })).resolves.toBe(0);
    expect(clients.authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER,
      expect.objectContaining({
        data: { userId: OWNER_USER_ID, reason: 'TENANT_ONBOARDING_FAILED' },
        processId: 'phase5-onboarding-profile-fail',
      }),
    );
    expect(clients.paymentClient.send).not.toHaveBeenCalled();
  });

  it('compensates initial subscription, tenant, and Keycloak owner when payment settings fails after subscription assignment', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const planCode = nextPlanCode();
    const slug = `phase5-onboarding-payment-fail-${randomUUID()}`;
    currentPlanCode = planCode;
    currentSlug = slug;
    await seedPlan(h, planCode);
    const clients = createTcpClients({ paymentError: new Error('payment settings unavailable') });
    const service = createService(h, clients);

    await expect(
      service.onboard({
        tenantName: 'Phase 5 Onboarding Payment Failure',
        slug,
        ownerEmail: 'phase5-payment-fail@example.com',
        ownerPassword: 'Password123!',
        planCode,
        processId: 'phase5-onboarding-payment-fail',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_ONBOARDING_FAILED });

    const tenantId = extractCreatedTenantId(clients);
    currentTenantId = tenantId;
    await expect(h.tenantRepo.findOneBy({ id: tenantId })).resolves.toBeNull();
    await expect(h.subscriptionRepo.countBy({ tenantId })).resolves.toBe(0);
    await expect(h.outboxRepo.countBy({ tenantId })).resolves.toBe(0);
    expect(clients.authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER,
      expect.objectContaining({
        data: { userId: OWNER_USER_ID, reason: 'TENANT_ONBOARDING_FAILED' },
        processId: 'phase5-onboarding-payment-fail',
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
    throw new Error(`[Phase 5 SaaS onboarding integration not ready] ${readiness.reason}`);
  }
}

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1 to opt in' };
  }

  try {
    const probe = await createDataSource();
    await probe.query('SELECT 1');
    await probe.destroy();
  } catch (error) {
    return { ok: false, reason: `PostgreSQL not ready: ${readinessMessage(error)}` };
  }

  return { ok: true };
}

async function createHarness(): Promise<Harness> {
  const dataSource = await createDataSource();
  return {
    dataSource,
    tenantRepo: dataSource.getRepository(Tenant),
    planRepo: dataSource.getRepository(PricingPlan),
    subscriptionRepo: dataSource.getRepository(Subscription),
    outboxRepo: dataSource.getRepository(SaasOutboxEvent),
  };
}

function createDataSource(): Promise<DataSource> {
  return createPostgresDataSource(
    process.env['SAAS_TYPEORM_DATABASE'] ?? process.env['TYPEORM_DATABASE'] ?? 'qrtable',
    [Tenant, PricingPlan, Subscription, SaasOutboxEvent],
  ).initialize();
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

function createService(harness: Harness, clients: TcpClients): OnboardingSagaService {
  const planRepository = new PricingPlanRepository(harness.planRepo);
  const subscriptionRepository = new SubscriptionRepository(harness.subscriptionRepo);
  const subscriptionService = new SubscriptionService(planRepository, subscriptionRepository);
  return new OnboardingSagaService(
    new TenantRepository(harness.tenantRepo),
    subscriptionService,
    clients.authorizerClient as unknown as TcpClient,
    clients.userClient as unknown as TcpClient,
    clients.paymentClient as unknown as TcpClient,
    new SaasOutboxRepository(harness.outboxRepo),
  );
}

function createTcpClients(options: { userError?: Error; paymentError?: Error } = {}): TcpClients {
  const authorizerClient = {
    send: jest.fn((message: string) => {
      if (message === TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER) {
        return tcpResponse({ data: { userId: OWNER_USER_ID } });
      }
      if (message === TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER) {
        return tcpResponse({ data: { userId: OWNER_USER_ID, enabled: false } });
      }
      return tcpResponse({ data: null });
    }),
  };
  const userClient = {
    send: jest.fn(() => {
      if (options.userError) {
        return tcpError(options.userError);
      }
      return tcpResponse({ data: { userId: OWNER_USER_ID } });
    }),
  };
  const paymentClient = {
    send: jest.fn(() => {
      if (options.paymentError) {
        return tcpError(options.paymentError);
      }
      return tcpResponse({ data: { ok: true } });
    }),
  };
  return { authorizerClient, userClient, paymentClient };
}

function extractCreatedTenantId(clients: TcpClients): string {
  const createOwnerCall = clients.authorizerClient.send.mock.calls.find(
    ([message]) => message === TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER,
  );
  const tenantId = createOwnerCall?.[1]?.data?.tenantId;
  if (!tenantId) {
    throw new Error('Expected onboarding saga to call CREATE_TENANT_OWNER with tenantId');
  }
  return String(tenantId);
}

function tcpResponse<T>(value: T): { toPromise: () => Promise<T> } {
  return { toPromise: () => Promise.resolve(value) };
}

function tcpError(error: Error): { toPromise: () => Promise<never> } {
  return { toPromise: () => Promise.reject(error) };
}

async function seedPlan(harness: Harness, code: string): Promise<PricingPlan> {
  await cleanupPlan(harness, code);
  return harness.planRepo.save(
    harness.planRepo.create({
      code,
      name: `Phase 5 Onboarding ${code}`,
      billingPeriod: 'MONTHLY',
      priceVnd: 0,
      maxTables: 12,
      maxStaff: 4,
      maxOrdersPerDay: 500,
      features: ['phase5-onboarding'],
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
    await cleanupTenant(harness, tenant.id);
  }
}

async function cleanupPlan(harness: Harness, code: string): Promise<void> {
  await harness.subscriptionRepo.delete({ planCodeSnapshot: code });
  await harness.planRepo.delete({ code });
}

function nextPlanCode(): string {
  return `P5ONB${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function readinessMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
