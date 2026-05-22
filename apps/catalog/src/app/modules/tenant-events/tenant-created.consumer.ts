import { CONFIGURATION } from '../../../configuration';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka } from 'kafkajs';
import { AreaService } from '../area/services/area.service';

const DEFAULT_AREA_NAME = 'Khu vực chính';

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

  constructor(
    private readonly areaService: AreaService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = CONFIGURATION.KAFKA_CONFIG.BROKERS;
    if (!brokers?.length) {
      this.logger.warn('Kafka brokers empty; tenant.created consumer will not run');
      return;
    }
    const kafka = new Kafka({
      clientId:
        this.configService?.get<string>('CATALOG_TENANT_EVENTS_CONFIG.CLIENT_ID') ??
        CONFIGURATION.CATALOG_TENANT_EVENTS_CONFIG.CLIENT_ID,
      brokers,
    });
    this.consumer = kafka.consumer({
      groupId:
        this.configService?.get<string>('CATALOG_TENANT_EVENTS_CONFIG.TENANT_CONSUMER_GROUP_ID') ??
        CONFIGURATION.CATALOG_TENANT_EVENTS_CONFIG.TENANT_CONSUMER_GROUP_ID,
    });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: CONFIGURATION.KAFKA_CONFIG.TENANT_CREATED_TOPIC, fromBeginning: false });
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
