-- Dev-only: remove manual refund feature schema (run against qrtable_payment).
-- Back up first if any non-dev data exists.

UPDATE payments SET status = 'PAID' WHERE status IN ('REFUND_PENDING', 'REFUNDED');

DROP TABLE IF EXISTS refunds CASCADE;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS "CHK_ payments_status";
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS "CHK_payments_status";

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check CHECK (status IN ('PENDING', 'PAID', 'FAILED'));

ALTER TABLE audit_payments DROP CONSTRAINT IF EXISTS "CHK_audit_payments_action";
ALTER TABLE audit_payments DROP CONSTRAINT IF EXISTS audit_payments_action_check;

ALTER TABLE audit_payments
  ADD CONSTRAINT audit_payments_action_check CHECK (
    action IN (
      'PAYMENT_CREATED',
      'CASH_CONFIRMED',
      'SEPAY_WEBHOOK_RECEIVED',
      'SEPAY_WEBHOOK_DUPLICATE',
      'SEPAY_WEBHOOK_UNDERPAID',
      'SEPAY_WEBHOOK_AFTER_PAID',
      'PAYMENT_COMPLETED'
    )
  );

DELETE FROM outbox_events WHERE event_type = 'payment.refunded';
