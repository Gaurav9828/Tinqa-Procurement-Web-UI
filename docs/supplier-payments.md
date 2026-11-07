# Supplier payment plans, payments and refund claims

> **Changed 2026-11-07.** Payments now go request → Super Admin approves → Finance Manager pays (reference) →
> supplier confirms, or says "not received" and gets it sent again with optional proof. Only the Super Admin decides,
> and the order's flow history is shown as a tree. See `payment-requests-and-flow-history.md`, which wins where the
> two differ (permissions, statuses, when the advance is due, and the steps below marked as replaced).
>
> **Changed again 2026-11-07.** Money back from a supplier (refunds, reversals of payments, failed pieces returned) is
> now paid by the supplier in their portal and checked by a Finance Manager; staff no longer record refunds, payment
> requests are approved and paid in plan order, and failed pieces go back through returns. See
> `supplier-returns-and-repayments.md`, which wins over both files.

Built 2026-11-06 in Procurement BE and the Web UI. Every quotation says how the supplier wants to be paid. Staff record
what was actually paid against that plan. A different person confirms each entry. The final part is paid only after
the delivered units are tested. If testing, a cancellation or a return leaves the supplier overpaid, a refund claim
against them opens by itself.

| Service | Owns |
| --- | --- |
| Procurement BE | Plan columns on `orders`, tables `supplier_payment` and `supplier_refund_claim`, and the `SUPPLIER_PAYMENTS` queue in `approval_queue_counts` (V8__orders.sql, V14__approval_queue_counts.sql, and V15__supplier_payment_cash_receipt.sql for the supplier receipt step, named when it was cash only). Also `com.tinqa.procurement.order.payment.*`, the permissions, and the hooks on stock approval, cancel and completed refund |
| Web UI | `PaymentPlanFields` in Create/Edit order and the supplier quotation form, `OrderPaymentsPanel` (order view, delivery dialog, supplier order view), Approvals Hub › Supplier payments, and the payment terms on printed documents |
| Ecommerce BE / Storefront | Nothing. Payments are tracked in Procurement only: the purchase is already booked to the company ledger from the approved stock entry, so posting payments as well would count the cost twice |

## Permissions

| Permission | Group | Who |
| --- | --- | --- |
| `PROCUREMENT_ORDER_VIEW` | `PROCUREMENT_ORDER_READ` | Everyone who sees orders also sees the order's payments and claim |
| `SUPPLIER_PAYMENT_RECORD` | `SUPPLIER_PAYMENT_MANAGEMENT` | Finance Manager (both levels) and Super Admin (Supplier Manager removed 2026-11-07) |
| `SUPPLIER_PAYMENT_APPROVE` | `SUPPLIER_PAYMENT_APPROVAL` (approval level) | Super Admin only (2026-11-07); never in a custom role |
| `SUPPLIER_PORTAL_VIEW` | `SUPPLIER_PORTAL` | The supplier: only their own order's confirmed entries and payments waiting for them, with no staff names |
| `SUPPLIER_PAYMENT_CONFIRM` | `SUPPLIER_PORTAL` | The supplier: confirms they received a payment (any method) for their own order, or says they did not |

## Rules

- **Plan.** `advancePercent` and `midtermPercent` are each 0 or more with 2 decimals, and together at most 50: the final
  part (100 minus both, paid after delivery and testing) is always at least 50 % (`PaymentPlan.MIN_FINAL_PERCENT`, Web
  UI `MIN_FINAL_PERCENT`; 2026-11-07, it was "together at most 100"). 80 % advance and 20 % at the end is refused.
  `expectedPaymentMethod` is `CASH`, `ONLINE`, `BANK_TRANSFER` or `CHEQUE`.
  - The rule applies to every plan that is set or changed: a supplier's quotation and change requests, staff's Create
    and Edit Order. A plan saved before the rule is only checked again when its split changes.
  - The advance and the method are required on a new quotation.
  - The midterm is optional: left out, it is stored as 0 %, the plan is advance plus final only, and no `MIDTERM`
    payment is offered or accepted.
  - An order made before payment plans existed has no plan (NULL).
  - The UI starts at 30 / 20 (50 % after testing), with a "Midterm payment" box to untick.
- **What TinQa changed.** A quotation the supplier raised keeps their own terms in `orders.supplier_quoted_terms`
  (V18, `SupplierQuotedTerms`): set when they raise it, and updated with each change of theirs that staff approve. Staff
  edits never touch it. The supplier portal's order (`changedByTinqa`) lists each term that now differs, what they
  quoted beside what it is (e.g. Advance payment 30% → 20%, Final payment 50% → 60%). Accepting an order with changes
  needs `changesAccepted: true` (else 400 on `changesAccepted`); the acceptance is kept in the status history as
  "Agreed to TinQa's changes: …". Staff can't confirm such an order for the supplier (409
  `ORDER_NEEDS_SUPPLIER_CONSENT`). A quotation staff prepared has no supplier terms, so nothing is compared.
- **When each part can be paid.**
  - Advance: once the supplier accepted the order (`CONFIRMED`, `SHIPPED`, `DELIVERED`; changed 2026-11-07, it was from
    approval on).
  - Midterm: once shipped (`SHIPPED`, `DELIVERED`).
  - Final: once the order's stock entry is approved, which is when testing is done.
  - Nothing more can be paid on a `CANCELLED` or `REFUND_COMPLETED` order.
- **How much (changed 2026-11-07).** A payment's amount is set by the plan, never typed: it is what is left of its part
  (`Milestone.left` in the summary = planned − paid − waiting), within the cap. The request may leave `amount` out (it
  is filled in); one that is given must equal it (400 on `amount`). Nothing left → 409 `SUPPLIER_PAYMENT_NOT_DUE`.
  - The cap: before testing at most advance + midterm of the quoted total (GST included); after testing at most what
    passed, i.e. `PurchasePostingRecorder.purchaseValue` + its GST. The final part is what passed less the advance and
    midterm parts.
  - Entries still waiting (for Level 2 or for the supplier) count towards the part and the cap.
  - **Settlement breakdown (2026-11-07).** Once tested (and not closed) the summary carries `settlement`
    (`PaymentSettlement`): ordered / passed / failed / short units, the quoted goods, shipment, GST and total, the
    value of the failed and undelivered units, the shipment dropped when no unit passed, the GST taken off, and what
    passed with its GST. The lines add up exactly: `orderValue − failedValue − shortValue − shipmentDropped −
    gstReduction = payable`. It explains the figures and decides nothing; the Web UI's Final settlement box (with
    Show full breakdown) shows it, down to the final payment (payable less net paid) or what the supplier owes back.
  - A refund's amount is still typed (the supplier may pay back in parts), at most what is still owed on the claim.
  - The Web UI pre-fills Record payment: the earliest part with something left, the quotation's expected method, today.
- **Every payment needs the supplier's receipt (2026-11-07; cash only at first, every method since the same day).**
  A `PAYMENT`, whatever its method (`SupplierPayment.needsSupplierReceipt`):
  - can be recorded, corrected or confirmed only for a supplier with an active supplier login (409
    `SUPPLIER_PAYMENT_NEEDS_LOGIN`);
  - once paid (replaced 2026-11-07: it was "once Level 2 confirms it"), becomes `AWAITING_SUPPLIER` (not `APPROVED`): the
    supplier is notified and My Orders flags the order (`paymentsToConfirm`);
  - counts as paid only when the supplier answers received (`APPROVED`, `supplier_responded_at`); not received, with a
    reason, makes it `NOT_RECEIVED` (`supplier_response_reason`; replaced 2026-11-07, it was `REJECTED`), and the Finance
    Manager re-sends it;
  - can no longer be withdrawn once it was sent to the supplier (replaced 2026-11-07), only while requested, approved
    to pay, or not received.
  - Refunds and reversals need no supplier step.
- **Reference (2026-11-07).** Every `PAYMENT` and `REFUND` not in cash must give `reference` (400 on `reference`): the
  transaction ID (`ONLINE`), the UTR number (`BANK_TRANSFER`) or the cheque number (`CHEQUE`). For `CASH` it is optional
  (e.g. a receipt number). Checked in `SupplierPaymentService.ensureReferenceGiven` on record and correction; a reversal
  copies the original's.
- **Maker-checker.**
  - Only `APPROVED` entries count.
  - The recorder cannot decide their own entry (403 `SUPPLIER_PAYMENT_SELF_DECISION`), but can correct or withdraw it
    while it is pending.
  - A confirmed entry never changes; it is corrected by a `REVERSAL`, which is confirmed like any entry.
  - **Reversal window** (2026-11-07). Once the order is delivered (or in a return started from delivery), tested
    (stock entry approved), fully paid (`paid − refunded ≥ payable`, `paid > 0`), and every payment is received by the
    supplier (`pendingPayments = 0`, no `REVERSAL` still open), the order's payments are final. `Summary.reversalClosed`
    is `true`, the UI hides Reverse and says "Payments are final", and `POST /v1/orders/payments/{id}/reversal` answers
    409 `SUPPLIER_PAYMENT_REVERSAL_CLOSED` for any of its entries. A reversal asked before the window closed runs to
    its end. Money still owed back for failed units goes through the refund claim. The rule is `Figures.reversalClosed`
    in `SupplierPaymentService`.
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
| PATCH | `/v1/supplier-portal/payments/{id}/receipt` | `SUPPLIER_PAYMENT_CONFIRM` (own orders; `{received, reason}`) |

Tests: `SupplierPaymentIntegrationTest`, `SupplierPortalIntegrationTest`, `ApprovalSummaryIntegrationTest` and
`PaymentPlanTest` in Procurement BE. `OrderPaymentsPanel.test.tsx`, `SupplierPaymentsInHub.test.tsx`,
`paymentPlan.test.ts`, `paymentDue.test.ts`, `CreateOrderModal.test.tsx` and `SupplierPortal.test.tsx` in the Web UI.
