# Phase 3 Payment Refactor Decisions

**Date:** 2026-05-09
**Status:** Accepted for safe refactor

## D1. Payment -> Order Settlement

Payment remains the source of truth for Payment aggregates. Order remains the source of truth for Bill aggregates.

When a payment is completed, Payment writes the payment mutation and a `payment.completed` outbox row in one DB transaction. After commit, Payment may call Order through `BILL_MARK_PAID` as a sync fast path for POS latency. Kafka `payment.completed` remains the recovery and fan-out path. Order `markPaid()` must be idempotent when the bill is already `PAID`.

## D2. VietQR Overpaid and Refund Amount

Underpaid SePay webhook keeps the payment `PENDING` and records `SEPAY_WEBHOOK_UNDERPAID`.
Overpaid SePay webhook is accepted as `PAID` and stores the actual received value in `paidAmount`.
Full refund means refunding the actual received value: `payment.paidAmount ?? payment.roundedTotal`.

## D3. Bill Payment Reference

Bill is owned by Order, but it stores the Payment aggregate id as nullable `payment_id` after payment completion. This is a reference, not ownership transfer.

## D4. Table Close Semantics

Canonical table state after successful payment is `Billing -> Cleaning`. Staff later marks the table `Available`.

The follow-up post-payment finalization work implements this transition in Order Service: `BILL_MARK_PAID` marks the bill paid, closes the session, and commands Catalog to move the table from `billing` to `cleaning`. Staff still marks `cleaning -> available`.

## D5. Phase 3 Realtime Baseline

POS/PWA correctness uses **polling/refetch** as the baseline. BFF may subscribe to Kafka `payment.completed` (and related topics) and emit WebSocket hints so clients invalidate queries sooner; that path does **not** replace server polling as the source of truth. Bridge coverage for `payment.refunded` follows the same principle where implemented.

## D6. Payment Database Configuration

Development may fall back to `TYPEORM_DATABASE` for demo speed. Staging and production must set `PAYMENT_TYPEORM_DATABASE`.
