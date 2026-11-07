# Payment requests and flow history

Built 2026-11-07 in Procurement BE and the Web UI. It extends `supplier-payments.md`; where the two differ, this file
wins.

> **Superseded in part (2026-11-07).** `supplier-returns-and-repayments.md` wins where they differ: reversals of
> payments go to the supplier to pay back (no Super Admin), staff no longer record refunds, refunds and reversals are
> checked by a Finance Manager (`REPAYMENT_DUE` → `REPAYMENT_SENT` → `APPROVED` / `REPAYMENT_MISSING`), payment requests
> are approved and paid in plan order (409 `SUPPLIER_PAYMENT_OUT_OF_ORDER`), and the timeline gains kind `RETURN`.

## 1. Payment flow (kind `PAYMENT`)

```
Finance Manager requests ──► Super Admin approves ──► Finance Manager pays (UTR / txn ID / cheque no.)
   PENDING_APPROVAL             TO_PAY                    AWAITING_SUPPLIER ──► supplier: received ──► APPROVED (paid)
        │                                                        ▲          └─► supplier: not received ──► NOT_RECEIVED
        └─ Super Admin rejects ──► REJECTED (flow stops)         └──── Finance Manager re-sends (+ optional proof) ◄┘
```

| Step | Who | Endpoint | From → to |
| --- | --- | --- | --- |
| Request | `SUPPLIER_PAYMENT_RECORD` (Finance Manager) | `POST /v1/orders/{id}/payments` `{kind:'PAYMENT', milestone, method, amount?, note?}`. No reference or date yet | → `PENDING_APPROVAL` |
| Correct | the requester | `PUT /v1/orders/payments/{id}` (same body) | `PENDING_APPROVAL` |
| Decide | `SUPPLIER_PAYMENT_APPROVE` (Super Admin only) | `PATCH /v1/orders/payments/{id}/decision` `{decision, reason}` (reason required to reject) | → `TO_PAY` or `REJECTED` |
| Pay | `SUPPLIER_PAYMENT_RECORD` | `PATCH /v1/orders/payments/{id}/paid` `{reference, paidOn, note?}` | `TO_PAY` → `AWAITING_SUPPLIER` |
| Supplier answers | `SUPPLIER_PAYMENT_CONFIRM` (own order) | `PATCH /v1/supplier-portal/payments/{id}/receipt` `{received, reason}` | → `APPROVED` or `NOT_RECEIVED` |
| Re-send | `SUPPLIER_PAYMENT_RECORD` | `POST /v1/orders/payments/{id}/resend`, multipart: `reference`, `paidOn`, `note` (required: what was re-checked), `proof` (optional PDF/JPG/PNG) | `NOT_RECEIVED` → `AWAITING_SUPPLIER` |
| Withdraw | the requester | `PATCH /v1/orders/payments/{id}/withdraw` | `PENDING_APPROVAL`, `TO_PAY` or `NOT_RECEIVED` → `WITHDRAWN` |
| Proof file | `PROCUREMENT_ORDER_VIEW` / `SUPPLIER_PORTAL_VIEW` (own order) | `GET /v1/orders/payments/{id}/proofs/{documentId}`, `GET /v1/supplier-portal/payments/{id}/proofs/{documentId}` | |
| To-make list | `SUPPLIER_PAYMENT_RECORD` | `GET /v1/orders/payments/to-make` (`TO_PAY` and `NOT_RECEIVED`, oldest first) | |

Rules:
- The amount is still set by the plan (`Milestone.left`). It is fixed when requested and re-checked when the Super
  Admin approves. `PENDING_APPROVAL`, `TO_PAY`, `AWAITING_SUPPLIER` and `NOT_RECEIVED` all count as waiting against
  the part and the cap. Only `APPROVED` counts as paid.
- The reference is required on Pay and Re-send unless the method is cash (`ensureReferenceGiven`). `paidOn` is not
  before the order date and not in the future.
- The advance is due once the supplier has **accepted** the order (`CONFIRMED`, `SHIPPED`, `DELIVERED`), not just
  after approval. The midterm is due from shipped on, and the final part after testing, as before.
- A proof file is accepted only on a re-send, never on the first payment.
- Every payment needs an active supplier login, checked at request and at pay (409 `SUPPLIER_PAYMENT_NEEDS_LOGIN`).
- Refunds and reversals keep the simple maker-checker: recorded, then decided by `SUPPLIER_PAYMENT_APPROVE`.
- Each entry carries `events` (append-only `supplier_payment_event`): `REQUESTED`, `CORRECTED`, `REQUEST_APPROVED`,
  `REQUEST_REJECTED`, `PAID`, `NOT_RECEIVED`, `RESENT`, `RECEIVED`, `WITHDRAWN`, and for refunds and reversals
  `RECORDED`, `APPROVED`, `REJECTED`. It also carries `paidByUsername`, `paidAt` and `sendCount`.
- The supplier sees entries in `AWAITING_SUPPLIER`, `NOT_RECEIVED` and `APPROVED`, and only events from `PAID` on,
  with no staff names.

## 2. Who holds what (changed)

- `SUPPLIER_PAYMENT_MANAGEMENT` (record): Finance Manager (both levels) and Super Admin. Removed from Supplier Manager.
- `SUPPLIER_PAYMENT_APPROVAL` (decide): Super Admin only. Removed from Supplier Manager and Finance Manager, and listed
  in `DesignationAccess.NEVER_IN_CUSTOM_ROLES`. A migration removes it from existing custom roles.

## 3. Approvals Hub

| Queue | Permissions | Counts |
| --- | --- | --- |
| `SUPPLIER_PAYMENTS` | `SUPPLIER_PAYMENT_APPROVE`, `PROCUREMENT_ORDER_VIEW` | `status = 'PENDING_APPROVAL'` (payment requests, refunds, reversals) |
| `SUPPLIER_PAYMENTS_TO_MAKE` (new) | `SUPPLIER_PAYMENT_RECORD`, `PROCUREMENT_ORDER_VIEW` | `status IN ('TO_PAY', 'NOT_RECEIVED')` |

The Super Admin's review shows the whole order: supplier, item, quoted total with GST, the plan's parts in ₹ (planned,
paid, waiting), what this request pays, and the order's flow history.

## 4. Flow history (timeline)

`GET /v1/orders/{id}/timeline` (`PROCUREMENT_ORDER_VIEW`) and `GET /v1/supplier-portal/orders/{id}/timeline`
(`SUPPLIER_PORTAL_VIEW`, own order) return:

```ts
interface OrderTimeline { orderId: number; orderNumber: string; events: TimelineEvent[] } // oldest first
interface TimelineEvent {
  id: string;                    // "status-12", "change-4-requested", "payment-7-3", "invoice-2", "claim-1-opened"
  at: string;                    // ISO instant
  kind: 'STATUS' | 'CHANGE_REQUEST' | 'PAYMENT' | 'INVOICE' | 'REFUND_CLAIM';
  title: string;                 // "Supplier Manager approved the quotation"
  detail: string | null;         // reason, UTR, amounts...
  actorRole: string | null;      // designation label, "Supplier", or null for the system
  actorName: string | null;      // staff view only; always null for the supplier
  tone: 'DONE' | 'WAITING' | 'REJECTED' | 'INFO';
  branchId: string | null;       // null = the order's main line; "payment-7", "change-4" = a branch
  branchTitle: string | null;    // "Advance payment ₹30,000.00 (Bank transfer)"
}
```

The trunk holds the status changes (quotation submitted, approved by the Supplier Manager, approved by the Super Admin,
accepted by the supplier, shipped...), invoice uploads and overrides, and refund claims. Each payment and each change
request is a branch, drawn from the point where it started. The timeline is built in a fixed number of queries, with
none per event.

Web UI: `OrderTimeline` (tree), loaded only when its section is opened, in the order view, the Approvals Hub reviews
and the supplier's order view.

## 5. Quotation details

Every quotation view (order view, Approvals Hub › Quotations / Orders review, supplier order view) shows everything the
supplier entered: item, quantity, unit price, shipment, GST breakup, total with GST, expected delivery, the payment
plan as parts in % and ₹ (advance, midterm, final after testing), the expected payment method, and the supplier's note.
