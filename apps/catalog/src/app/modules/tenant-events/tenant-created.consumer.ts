import { CONFIGURATION } from '../../../configuration';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { AreaService } from '../area/services/area.service';

const DEFAULT_AREA_NAME = 'Khu vực chính';
const TENANT_CREATED_TOPIC = process.env['KAFKA_TENANT_CREATED_TOPIC'] || 'tenant.created';

export type TenantCreatedEventPayload = {
  tenantId: string;
  tenantSlug?: string;
  tenantName?: string;
  slug?: string;
  name?: string;
  processId?: string;
  correlationId?: string;
};

@Injectable()
export class TenantCreatedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantCreatedConsumer.name);
  private consumer: Consumer | null = null;

  constructor(private readonly areaService: AreaService) {}

  async onModuleInit(): Promise<void> {
    const brokers = CONFIGURATION.KAFKA_CONFIG.BROKERS;
    if (!brokers?.length) {
      this.logger.warn('Kafka brokers empty; tenant.created consumer will not run');
      return;
    }
    const kafka = new Kafka({
      clientId: process.env['KAFKA_CATALOG_CLIENT_ID'] || 'qrtable-catalog-service',
      brokers,
    });
    this.consumer = kafka.consumer({
      groupId: process.env['KAFKA_CATALOG_TENANT_CONSUMER_GROUP'] || 'catalog-tenant-created-consumer-group',
    });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: TENANT_CREATED_TOPIC, fromBeginning: false });
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString('utf8');
        if (!raw) {
          return;
        }
        await this.handleTenantCreated(JSON.parse(raw) as TenantCreatedEventPayload);
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect().catch(() => undefined);
    this.consumer = null;
  }

  async handleTenantCreated(event: TenantCreatedEventPayload): Promise<{ seeded: boolean; reason?: string }> {
    const exists = await this.areaService.existsByTenantIdAndName(event.tenantId, DEFAULT_AREA_NAME);
    if (exists) {
      return { seeded: false, reason: 'DEFAULT_AREA_EXISTS' };
    }
    await this.areaService.createSystemArea({
      tenantId: event.tenantId,
      name: DEFAULT_AREA_NAME,
      processId: event.processId ?? event.correlationId,
    });
    return { seeded: true };
  }
}
