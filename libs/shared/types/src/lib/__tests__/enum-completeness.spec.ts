import {
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  SessionStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  PaymentMethod,
} from '../../index';

describe('Enum completeness — canonical values per Step 2.3 spec', () => {
  it('OrderStatus has exactly 7 values per phase doc §8', () => {
    expect(Object.values(OrderStatus).sort()).toEqual(
      ['CANCELED', 'COMPLETED', 'DRAFT', 'PENDING', 'PROCESSING', 'READY', 'SERVED'].sort(),
    );
  });

  it('OrderItemStatus has exactly 4 values (kitchen subset, no DRAFT/PENDING/COMPLETED)', () => {
    expect(Object.values(OrderItemStatus).sort()).toEqual(['CANCELED', 'PROCESSING', 'READY', 'SERVED'].sort());
  });

  it('BillStatus has exactly 3 values (Phase 2A scope, PAID forward-compat)', () => {
    expect(Object.values(BillStatus).sort()).toEqual(['OPEN', 'PAID', 'PENDING_PAYMENT'].sort());
  });

  it('SessionStatus has exactly 2 values (IDLE is internal Redis TTL, not exposed)', () => {
    expect(Object.values(SessionStatus).sort()).toEqual(['ACTIVE', 'CLOSED'].sort());
  });

  it('ServiceRequestType has exactly 3 values per phase doc', () => {
    expect(Object.values(ServiceRequestType).sort()).toEqual(['CALL_STAFF', 'GENERAL_HELP', 'REQUEST_BILL'].sort());
  });

  it('ServiceRequestStatus has exactly 3 values per phase doc §8', () => {
    expect(Object.values(ServiceRequestStatus).sort()).toEqual(['ACKNOWLEDGED', 'PENDING', 'RESOLVED'].sort());
  });

  it('PaymentMethod has exactly 1 value (Phase 2A — CASH only; Phase 3 mở rộng)', () => {
    expect(Object.values(PaymentMethod).sort()).toEqual(['CASH']);
  });

  it('All enum values are UPPERCASE strings (no lowercase, no kebab-case)', () => {
    const allEnums = [
      OrderStatus,
      OrderItemStatus,
      BillStatus,
      SessionStatus,
      ServiceRequestType,
      ServiceRequestStatus,
      PaymentMethod,
    ];
    allEnums.forEach((enumObj) => {
      Object.values(enumObj).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value).toBe(String(value).toUpperCase());
      });
    });
  });

  it('All enum keys === values (no accidental key/value mismatch)', () => {
    const allEnums = [
      OrderStatus,
      OrderItemStatus,
      BillStatus,
      SessionStatus,
      ServiceRequestType,
      ServiceRequestStatus,
      PaymentMethod,
    ];
    allEnums.forEach((enumObj) => {
      Object.entries(enumObj).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });
  });
});
