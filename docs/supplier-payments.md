# Supplier payment plans, payments and refund claims

Built 2026-11-06 in Procurement BE and the Web UI. Every quotation says how the supplier wants to be paid. Staff record
what was actually paid against that plan. A different person confirms each entry. The final part is paid only after
the delivered units are tested. If testing, a cancellation or a return leaves the supplier overpaid, a refund claim
against them opens by itself.

| Service | Owns |
| --- | --- |
| Procurement BE | Plan columns on `orders`, tables `supplier_payment` and `supplier_refund_claim`, and the `SUPPLIER_PAYMENTS` queue in `approval_queue_counts` (all in V23). Also `com.tinqa.procurement.order.payment.*`, the permissions, and the hooks on stock approval, cancel and completed refund |
| Web UI | `PaymentPlanFields` in Create/Edit order and the supplier quotation form, `OrderPaymentsPanel` (order view, delivery dialog, supplier order view), Approvals Hub › Supplier payments, and the payment terms on printed documents |
| Ecommerce BE / Storefront | Nothing. Payments are tracked in Procurement only: the purchase is already booked to the company ledger from the approved stock entry, so posting payments as well would count the cost twice |

## Permissions

| Permission | Group | Who |
| --- | --- | --- |
| `PROCUREMENT_ORDER_VIEW` | `PROCUREMENT_ORDER_READ` | Everyone who sees orders also sees the order's payments and claim |
| `SUPPLIER_PAYMENT_RECORD` | `SUPPLIER_PAYMENT_MANAGEMENT` | Supplier Manager and Finance Manager (both levels), and Super Admin |
| `SUPPLIER_PAYMENT_APPROVE` | `SUPPLIER_PAYMENT_APPROVAL` (approval level) | The same roles, at Level 2 only |
| `SUPPLIER_PORTAL_VIEW` | `SUPPLIER_PORTAL` | The supplier: only their own order's confirmed entries, with no staff names |

## Rules

- **Plan.** `advancePercent` and `midtermPercent` are each 0 to 100 with 2 decimals, and together at most 100. The final
  part is 100 minus both. `expectedPaymentMethod` is `CASH`, `ONLINE`, `BANK_TRANSFER` or `CHEQUE`.
  - The advance and the method are required on a new quotation.
  - The midterm is optional: left out, it is stored as 0 %, the plan is advance plus final only, and no `MIDTERM`
    payment is offered or accepted.
  - An order made before V23 has no plan (NULL).
  - The UI starts at 30 / 30, with a "Midterm payment" box to untick.
- **When each part can be paid.**
  - Advance: from approval on (`SUPPLIER_LEVEL_PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`).
  - Midterm: once shipped (`SHIPPED`, `DELIVERED`).
  - Final: once the order's stock entry is approved, which is when testing is done.
  - Nothing more can be paid on a `CANCELLED` or `REFUND_COMPLETED` order.
- **How much.** Any amount can go against any open part (e.g. a 50 % advance on a 30 % plan), but the total is capped:
  - before testing: at most advance + midterm of the quoted total (GST included);
  - after testing: at most what passed, i.e. `PurchasePostingRecorder.purchaseValue` + its GST.
  - Entries still waiting for confirmation count towards the cap.
- **Maker-checker.**
  - Only `APPROVED` entries count.
  - The recorder cannot decide their own entry (403 `SUPPLIER_PAYMENT_SELF_DECISION`), but can correct or withdraw it
    while it is pending.
  - A confirmed entry never changes; it is corrected by a `REVERSAL`, which is confirmed like any entry.
  - Confirming re-checks the cap.
- **Refund claim.** `SupplierPaymentService.reconcile` runs after a stock decision, a cancel, a completed refund, each
  confirmed entry and each claim change.
  - Once tested or closed, overpaid = paid − payable. If that is above 0, a claim opens with cause `FAILED_TESTING`,
    `ORDER_CANCELLED` or `ORDER_RETURNED` and the failed units, and the supplier and the payment recorders are notified.
  - A Level 2 can lower `agreedAmount`, to at most the overpaid amount, with a reason.
  - The claim is `SETTLED` once confirmed `REFUND` entries reach `agreedAmount`.

## Endpoints

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/v1/orders/{id}/payments` | `PROCUREMENT_ORDER_VIEW` |
| POST | `/v1/orders/{id}/payments` | `SUPPLIER_PAYMENT_RECORD` |
| PUT | `/v1/orders/payments/{id}` | `SUPPLIER_PAYMENT_RECORD` (recorder, pending only) |
| PATCH | `/v1/orders/payments/{id}/withdraw` | `SUPPLIER_PAYMENT_RECORD` (recorder, pending only) |
| POST | `/v1/orders/payments/{id}/reversal` | `SUPPLIER_PAYMENT_RECORD` |
| GET | `/v1/orders/payments?status=PENDING_APPROVAL` | `SUPPLIER_PAYMENT_APPROVE` (Approvals Hub queue) |
| PATCH | `/v1/orders/payments/{id}/decision` | `SUPPLIER_PAYMENT_APPROVE` |
| PATCH | `/v1/orders/{id}/refund-claim` | `SUPPLIER_PAYMENT_APPROVE` |
| GET | `/v1/supplier-portal/orders/{id}/payments` | `SUPPLIER_PORTAL_VIEW` (own orders) |

Tests: `SupplierPaymentIntegrationTest`, `SupplierPortalIntegrationTest`, `ApprovalSummaryIntegrationTest` and
`PaymentPlanTest` in Procurement BE. `OrderPaymentsPanel.test.tsx`, `SupplierPaymentsInHub.test.tsx`,
`paymentPlan.test.ts`, `CreateOrderModal.test.tsx` and `SupplierPortal.test.tsx` in the Web UI.
