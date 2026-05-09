import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './controllers/payment.controller';
import { AuditPaymentEntity } from './entities/audit-payment.entity';
import { PaymentOutboxEventEntity } from './entities/payment-outbox-event.entity';
import { PaymentEntity } from './entities/payment.entity';
import { RefundEntity } from './entities/refund.entity';
import { AuditPaymentRepository } from './repositories/audit-payment.repository';
import { PaymentOutboxRepository } from './repositories/payment-outbox.repository';
import { PaymentRepository } from './repositories/payment.repository';
import { RefundRepository } from './repositories/refund.repository';
import { PaymentOutboxPublisherService } from './services/payment-outbox-publisher.service';
import { PaymentMapper } from './services/payment.mapper';
import { PaymentOrderGateway } from './services/payment-order.gateway';
import { PaymentQueryService } from './services/payment-query.service';
import { PaymentReferenceService } from './services/payment-reference.service';
import { PaymentSettlementService } from './services/payment-settlement.service';
import { PaymentService } from './services/payment.service';
import { RefundService } from './services/refund.service';
import { SepayWebhookService } from './services/sepay-webhook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, RefundEntity, AuditPaymentEntity, PaymentOutboxEventEntity]),
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.ORDER_SERVICE)]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentMapper,
    PaymentOrderGateway,
    PaymentQueryService,
    PaymentSettlementService,
    SepayWebhookService,
    PaymentService,
    RefundService,
    PaymentReferenceService,
    PaymentOutboxPublisherService,
    PaymentRepository,
    RefundRepository,
    AuditPaymentRepository,
    PaymentOutboxRepository,
  ],
})
export class PaymentModule {}
