import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import { RefundService } from '../services/refund.service';

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return Object.assign(new PaymentEntity(), {
    id: 'payment-1',
    tenantId: 'tenant-1',
    billId: '11111111-1111-4111-8111-111111111111',
    billReference: 'QRTBL11111111',
    method: 'VIETQR',
    status: 'PAID',
    rawTotal: 127_500,
    roundedTotal: 128_000,
    roundingDelta: 500,
    paidAmount: 128_000,
    amountReceived: null,
    changeAmount: null,
    sepayTransactionId: 1,
    sepayReferenceCode: null,
    sepayGateway: null,
    sepayAccountNumber: null,
    sepayTransferContent: null,
    sepayTransactionDate: null,
    paidAt: new Date('2026-05-08T10:00:00.000Z'),
    createdAt: new Date('2026-05-08T10:00:00.000Z'),
    updatedAt: new Date('2026-05-08T10:00:00.000Z'),
    ...overrides,
  });
}

describe('RefundService', () => {
  function buildService(mocks: {
    payment: PaymentEntity;
    blockingRefund?: RefundEntity | null;
    refundForConfirm?: RefundEntity;
    paymentForConfirm?: PaymentEntity;
  }) {
    const manager = {
      save: jest.fn().mockImplementation(async (_: unknown, entity: PaymentEntity | RefundEntity) => {
        if ('reason' in entity && 'paymentId' in entity && 'status' in entity && entity.status === 'PENDING_STAFF_ACTION') {
          return {
            ...entity,
            id: 'refund-new',
            requestedAt: new Date('2026-05-08T11:00:00.000Z'),
          };
        }
        return entity;
      }),
      create: jest.fn((_cls: unknown, plain: object) => ({ ...plain })),
    };

    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<unknown>) => fn(manager as unknown as EntityManager)),
    };

    const paymentRepo = {
      findByTenantAndIdForUpdate: jest
        .fn()
        .mockResolvedValue(mocks.paymentForConfirm ?? mocks.payment),
    };

    const refundRepo = {
      findBlockingRefundForPayment: jest.fn().mockImplementation(async () => mocks.blockingRefund ?? null),
      findByTenantAndIdForUpdate: jest.fn().mockResolvedValue(mocks.refundForConfirm ?? null),
    };

    const auditRepo = { createRefundAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createRefunded: jest.fn().mockResolvedValue(undefined) };

    const service = new RefundService(
      dataSource as unknown as DataSource,
      paymentRepo as never,
      refundRepo as never,
      auditRepo as never,
      outboxRepo as never,
    );

    return { service, manager, paymentRepo, refundRepo, auditRepo, outboxRepo };
  }

  it('requestRefund uses paidAmount when present (overpaid SePay)', async () => {
    const payment = makePayment({ paidAmount: 135_000, roundedTotal: 128_000 });
    const { service, manager } = buildService({ payment });

    const result = await service.requestRefund({
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      userId: 'staff-1',
      reason: 'Customer request',
    });

    expect(result.amount).toBe(135_000);
    const refundSaveArg = manager.save.mock.calls.find((c) => c[0] === RefundEntity)?.[1] as RefundEntity | undefined;
    expect(refundSaveArg?.amount).toBe(135_000);
  });

  it('requestRefund falls back to roundedTotal when paidAmount is null', async () => {
    const payment = makePayment({ paidAmount: null });
    const { service } = buildService({ payment });

    const result = await service.requestRefund({
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      userId: 'staff-1',
      reason: 'Customer request',
    });

    expect(result.amount).toBe(128_000);
  });

  it('requestRefund rejects when a blocking refund already exists', async () => {
    const payment = makePayment();
    const blocking = { id: 'refund-block', paymentId: payment.id } as RefundEntity;
    const { service } = buildService({ payment, blockingRefund: blocking });

    await expect(
      service.requestRefund({
        tenantId: 'tenant-1',
        paymentId: 'payment-1',
        userId: 'staff-1',
        reason: 'dup',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmRefund marks refund CONFIRMED and payment REFUNDED, emits outbox', async () => {
    const paid = makePayment({ status: 'REFUND_PENDING' });
    const pendingRefund: RefundEntity = Object.assign(new RefundEntity(), {
      id: 'refund-1',
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      amount: 128_000,
      reason: 'r',
      status: 'PENDING_STAFF_ACTION',
      requestedByUserId: 'u1',
      requestedAt: new Date('2026-05-08T10:00:00.000Z'),
      confirmedByUserId: null,
      confirmedAt: null,
      customerBankAccount: null,
      customerBankName: null,
      customerAccountName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { service, outboxRepo } = buildService({
      payment: makePayment({ status: 'PAID' }),
      refundForConfirm: pendingRefund,
      paymentForConfirm: paid,
    });

    const result = await service.confirmRefund({
      tenantId: 'tenant-1',
      refundId: 'refund-1',
      userId: 'staff-2',
      processId: 'p1',
    });

    expect(result.status).toBe('CONFIRMED');
    expect(paid.status).toBe('REFUNDED');
    expect(outboxRepo.createRefunded).toHaveBeenCalled();
  });
});
