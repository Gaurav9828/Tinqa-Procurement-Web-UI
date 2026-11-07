# Supplier repayments, payment order and failed-piece returns

Built 2026-11-07 in Procurement BE, Ecommerce BE and the Web UI. It extends `supplier-payments.md` and
`payment-requests-and-flow-history.md`; where they differ, this file wins.

Three rules, all asked for by the user on 2026-11-07:

1. **Money back from a supplier is paid by the supplier and checked by a Finance Manager.** A reversal of a
   payment the supplier already confirmed goes to the supplier, who pays it back and gives the UTR / transaction ID
   (and optionally a receipt). A Finance Manager confirms it arrived, or says it did not; the supplier then sends it
   again with a receipt. The Super Admin can see every step but approves nothing here.
2. **Payment requests are approved and paid in plan order.** All parts may be requested at once, but the midterm is
   approved only after the advance, and the final part only after the midterm. The same order applies when paying.
3. **Failed pieces go back to the supplier, who repays them.** After testing, a Supplier Manager raises a return of
   the failed pieces. The Super Admin approves it, the supplier accepts it, and the pieces are shipped to the supplier
   (or the supplier collects them). The supplier confirms they arrived and pays back what TinQa paid for those pieces
   plus the return shipping charge. A Finance Manager confirms the money. The Super Admin approves only the return
   itself and only follows the rest.

Every confirmed repayment goes to the company account's **Supplier money** history (Ecommerce BE) with its trail:
order, return, reason, method, UTR / transaction ID, receipt, who confirmed it. Only money the ledger never had moves
the balance: the return shipping charge, posted as `SUPPLIER_CHARGES_RECOVERED`. The piece amount and reversals are
recorded but do not move the balance. Purchases are booked only for passed units (`PurchasePostingRecorder`), and
payments to suppliers are not posted, so posting them would count them twice (the user chose this on 2026-11-07).

## 1. Repayments (kinds `REFUND` and `REVERSAL` of a payment)

```
Reversal:  Finance Manager asks ──► REPAYMENT_DUE ──► supplier pays (method, UTR, paidOn, receipt?) ──► REPAYMENT_SENT
Return:    supplier confirms pieces arrived ──► REPAYMENT_DUE ──┘                                        │
Claim:     supplier pays a refund due on their own ────────────────────────────────────────────────► REPAYMENT_SENT
                                                                                                         │
REPAYMENT_SENT ──► Finance Manager: received ──► APPROVED (counts; posted to Supplier money)
               └─► Finance Manager: not received (reason) ──► REPAYMENT_MISSING ──► supplier sends again (+ receipt) ──┘
```

New `SupplierPaymentStatus` values: `REPAYMENT_DUE`, `REPAYMENT_SENT`, `REPAYMENT_MISSING`. New event types:
`REPAYMENT_REQUESTED`, `REPAYMENT_SENT`, `REPAYMENT_RESENT`, `REPAYMENT_MISSING`, `REPAYMENT_RECEIVED`. The supplier sees
all of them, never with staff names.

| Step | Who | Endpoint | From → to |
| --- | --- | --- | --- |
| Ask for a reversal | `SUPPLIER_PAYMENT_RECORD` | `POST /v1/orders/payments/{id}/reversal` `{reason}` (the original is an `APPROVED` `PAYMENT`) | → `REVERSAL` in `REPAYMENT_DUE` |
| Withdraw the ask | the asker | `PATCH /v1/orders/payments/{id}/withdraw` | `REPAYMENT_DUE` → `WITHDRAWN` |
| Pay back an ask | `SUPPLIER_REPAYMENT_SUBMIT` (own order) | `POST /v1/supplier-portal/payments/{id}/repayment`, multipart: `method`, `reference` (required unless `CASH`), `paidOn`, `note?`, `receipt?` (PDF/PNG/JPG/WEBP, ≤ 5 MB) | `REPAYMENT_DUE` or `REPAYMENT_MISSING` → `REPAYMENT_SENT` |
| Pay a refund due | `SUPPLIER_REPAYMENT_SUBMIT` (own order) | `POST /v1/supplier-portal/orders/{orderId}/repayments`, multipart: `amount`, then as above | → new `REFUND` in `REPAYMENT_SENT` |
| Check | `SUPPLIER_PAYMENT_RECORD` | `PATCH /v1/orders/payments/{id}/repayment-check` `{received: boolean, reason?}` (reason required when not received) | `REPAYMENT_SENT` → `APPROVED` or `REPAYMENT_MISSING` |
| To-check list | `SUPPLIER_PAYMENT_RECORD` | `GET /v1/orders/payments/repayments-to-check` (`REPAYMENT_SENT`, oldest first) | |
| Receipt file | `PROCUREMENT_ORDER_VIEW` / `SUPPLIER_PORTAL_VIEW` (own) | the existing `.../payments/{id}/proofs/{documentId}` | |

Rules:
- A reversal of a **payment** no longer goes to the Super Admin. A reversal of a **refund** is money going out to the
  supplier, so it keeps the old path: `PENDING_APPROVAL`, then decided by `SUPPLIER_PAYMENT_APPROVE`.
- Staff no longer record refunds (`POST /v1/orders/{id}/payments` with `kind: 'REFUND'` → 400 on `kind`). The
  supplier pays a refund in their portal: at most the claim's `refundDue`, less refunds still in flight.
- The asks need an active supplier login (409 `SUPPLIER_PAYMENT_NEEDS_LOGIN`).
- No reversal once the order's payments are final: delivered, tested, fully paid and every payment received by the
  supplier, with no reversal open (409 `SUPPLIER_PAYMENT_REVERSAL_CLOSED`, `Summary.reversalClosed`; see
  `supplier-payments.md`).
- `paidOn` is not before the order date and not in the future. The reference is required unless the method is cash.
- A repayment counts only once it is `APPROVED`. While it is due, sent or missing, a refund counts in
  `pendingRefunds`, and a reversal counts nowhere yet. `APPROVED` reconciles the claim; for a return's repayment it
  also settles the return.
- `chargeAmount` (new column, ≥ 0, default 0) is the return shipping charge in a return's repayment. It is paid on top
  of `amount` and never counts towards the claim. The supplier pays `amount + chargeAmount`.

Entry (`SupplierPaymentDTOs.Entry`, TS `SupplierPaymentEntry`) gains:
```ts
chargeAmount: number;          // 0 unless a return's shipping charge
returnId: number | null;       // the return this repayment is for
/** PENDING_APPROVAL payment requests: the earlier part that must be approved first, or null when it can be approved now */
waitsFor: PaymentMilestone | null;
```

## 2. Plan order (payment requests)

- `PATCH /v1/orders/payments/{id}/decision` with `APPROVED` on a `PAYMENT`: every earlier part of the plan (advance <
  midterm < final; a part planned at ₹0 is skipped) must have no request still `PENDING_APPROVAL`, and nothing left
  that was never requested. Otherwise 409 `SUPPLIER_PAYMENT_OUT_OF_ORDER` ("Approve the advance payment of order X
  first..."). Rejecting is always allowed.
- `PATCH /v1/orders/payments/{id}/paid`: no earlier part may still be `TO_PAY` (409 `SUPPLIER_PAYMENT_OUT_OF_ORDER`).
- `waitsFor` on the entry tells the UI to disable Approve and show "Approve the advance first". In the order's list it
  reflects both rules. In the Approvals Hub queue it reflects requests waiting in the same queue; the server still
  enforces the full rule.

## 3. Failed-piece returns (`supplier_return`)

```
Supplier Manager raises ──► PENDING_APPROVAL ──► Super Admin approves ──► AWAITING_SUPPLIER ──► supplier accepts ──► ACCEPTED
                                    └─► Super Admin rejects ──► REJECTED          └─► declines (reason) ──► DECLINED ──► SM sends again ──┘
ACCEPTED ──► SM records dispatch (TinQa ships: courier, tracking no., charge / supplier collects: date) ──► IN_TRANSIT
IN_TRANSIT ──► supplier confirms the pieces arrived ──► RECEIVED_BY_SUPPLIER (+ repayment ask, REPAYMENT_DUE) ──► FM confirms ──► SETTLED
Cancel (SM, reason): from PENDING_APPROVAL, AWAITING_SUPPLIER, DECLINED or ACCEPTED ──► CANCELLED
```

| Step | Who | Endpoint |
| --- | --- | --- |
| List an order's returns | `PROCUREMENT_ORDER_VIEW` | `GET /v1/orders/{orderId}/returns` → `OrderReturns` |
| Raise | `SUPPLIER_RETURN_REQUEST` | `POST /v1/orders/{orderId}/returns` `{units, reason, pieceDetails?, shippingMode}` |
| Queue | `SUPPLIER_RETURN_APPROVE` | `GET /v1/orders/returns/waiting` (`PENDING_APPROVAL`, oldest first) |
| Decide | `SUPPLIER_RETURN_APPROVE` (not the raiser) | `PATCH /v1/orders/returns/{id}/decision` `{decision: 'APPROVED' \| 'REJECTED', reason?}` (reason required to reject) |
| Send again | `SUPPLIER_RETURN_REQUEST` | `PATCH /v1/orders/returns/{id}/resend` `{note}` (`DECLINED` → `AWAITING_SUPPLIER`) |
| Cancel | `SUPPLIER_RETURN_REQUEST` | `PATCH /v1/orders/returns/{id}/cancel` `{reason}` |
| Dispatch | `SUPPLIER_RETURN_REQUEST` | `PATCH /v1/orders/returns/{id}/dispatch` `{dispatchedOn, courier?, trackingNumber?, shippingCharge?, note?}` |
| Supplier: list | `SUPPLIER_PORTAL_VIEW` (own) | `GET /v1/supplier-portal/orders/{orderId}/returns` → `OrderReturns` (from `AWAITING_SUPPLIER` on, no staff names) |
| Supplier: answer | `SUPPLIER_RETURN_RESPOND` (own) | `PATCH /v1/supplier-portal/returns/{id}/response` `{accepted, reason?}` (reason required to decline) |
| Supplier: arrived | `SUPPLIER_RETURN_RESPOND` (own) | `PATCH /v1/supplier-portal/returns/{id}/received` `{note?}` |

Rules:
- A return can be raised once the order's stock entry is approved (`tested`) with failed units. All its returns that
  are not `REJECTED` or `CANCELLED` together hold at most the failed units. The order may not be `CANCELLED` or
  `REFUND_COMPLETED`. The supplier needs an active login. Otherwise 409 `SUPPLIER_RETURN_NOT_ALLOWED`.
- A wrong step for the status → 409 `SUPPLIER_RETURN_WRONG_STATUS`. Deciding a return you raised yourself → 403
  `SUPPLIER_RETURN_SELF_DECISION`.
- `shippingMode`: `TINQA_SHIPS` (TinQa sends the pieces; dispatch needs `courier`, `trackingNumber` and
  `shippingCharge` ≥ 0, which the supplier repays) or `SUPPLIER_PICKUP` (the supplier collects them; `dispatchedOn`
  is the pickup date, `courier` may name who collected them, and there is no charge). `dispatchedOn` is not in the
  future.
- `piecesValue` = units × unit price plus its GST under the quotation (shown for the Super Admin's decision).
- When the pieces arrive, the repayment ask is created:
  - `amount` = what TinQa paid for the pieces: min(`piecesValue`, the claim's agreed amount less what was refunded
    and less refunds in flight), never below 0;
  - `chargeAmount` = the shipping charge.
  - Both 0 (e.g. only the advance was paid and the supplier collected the pieces) → the return is `SETTLED` at once.
- `SETTLED` when the ask is `APPROVED`.

```ts
type SupplierReturnStatus = 'PENDING_APPROVAL' | 'REJECTED' | 'AWAITING_SUPPLIER' | 'DECLINED' | 'ACCEPTED'
  | 'IN_TRANSIT' | 'RECEIVED_BY_SUPPLIER' | 'SETTLED' | 'CANCELLED';
type ReturnShippingMode = 'TINQA_SHIPS' | 'SUPPLIER_PICKUP';
type ReturnEventType = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ACCEPTED' | 'DECLINED' | 'RESENT' | 'DISPATCHED'
  | 'RECEIVED' | 'SETTLED' | 'CANCELLED';

interface ReturnEvent { id: number; type: ReturnEventType; at: string; actorRole: string | null; actorName: string | null; note: string | null }

interface SupplierReturn {
  id: number; orderId: number; orderNumber: string; supplierName: string; itemName: string | null;
  units: number; unitType: string | null; unitPrice: number;
  reason: string; pieceDetails: string | null; shippingMode: ReturnShippingMode; status: SupplierReturnStatus;
  piecesValue: number;
  courier: string | null; trackingNumber: string | null; dispatchedOn: string | null; shippingCharge: number | null;
  /** Once the pieces arrived: the repayment ask, and what it asks (amount + chargeAmount) */
  repaymentId: number | null; amountDue: number | null;
  requestedByUsername: string | null;  // staff view only
  requestedAt: string;
  decidedByUsername: string | null;    // staff view only
  decidedAt: string | null;
  decisionReason: string | null;       // staff view only
  supplierRespondedAt: string | null; supplierResponseReason: string | null;
  receivedAt: string | null; settledAt: string | null; cancelReason: string | null;
  events: ReturnEvent[];               // the supplier sees them from APPROVED on, without names
}

interface OrderReturns {
  orderId: number; tested: boolean;
  failedUnits: number;      // the approved stock entry's failed units
  unitsInReturns: number;   // held by returns that are not rejected or cancelled
  unitsLeft: number;
  canRaise: boolean;        // tested, units left, order open, supplier has a login
  returns: SupplierReturn[]; // newest first
}
```

## 4. Permissions (Procurement catalog)

| Permission | Group | Who |
| --- | --- | --- |
| `SUPPLIER_RETURN_REQUEST` | `PROCUREMENT_ORDER_MANAGEMENT` | Supplier Manager (both levels), Super Admin |
| `SUPPLIER_RETURN_APPROVE` | `SUPPLIER_PAYMENT_APPROVAL` | Super Admin only (the group is never in a custom role) |
| `SUPPLIER_RETURN_RESPOND` | `SUPPLIER_PORTAL` | The supplier: accepts/declines a return, confirms the pieces arrived |
| `SUPPLIER_REPAYMENT_SUBMIT` | `SUPPLIER_PORTAL` | The supplier: pays back an ask or a refund due |
| `SUPPLIER_PAYMENT_RECORD` (now also) | `SUPPLIER_PAYMENT_MANAGEMENT` | Finance Manager: asks for reversals and checks repayments |

## 5. Approvals Hub queues (`approval_queue_counts`, `ApprovalQueue`, `approvalSummaryApi.ts`)

| Queue | Permissions | Counts | List |
| --- | --- | --- | --- |
| `SUPPLIER_RETURNS` | `SUPPLIER_RETURN_APPROVE`, `PROCUREMENT_ORDER_VIEW` | `supplier_return.status = 'PENDING_APPROVAL'` | `GET /v1/orders/returns/waiting` |
| `SUPPLIER_REPAYMENTS` | `SUPPLIER_PAYMENT_RECORD`, `PROCUREMENT_ORDER_VIEW` | `supplier_payment.status = 'REPAYMENT_SENT'` | `GET /v1/orders/payments/repayments-to-check` |

`SUPPLIER_PAYMENTS` and `SUPPLIER_PAYMENTS_TO_MAKE` are unchanged. Reversals of payments no longer reach
`PENDING_APPROVAL`, and the new statuses are not in either queue.

## 6. Supplier portal flags (`SupplierPortalDTOs.Order`)

Besides `paymentsToConfirm`: `repaymentsDue` (own entries in `REPAYMENT_DUE` or `REPAYMENT_MISSING`) and
`returnsToAnswer` (returns `AWAITING_SUPPLIER` or `IN_TRANSIT`). My Orders flags an order when any is above 0.

## 7. Flow history

- The timeline gains kind `RETURN`: each return is a branch `return-{id}` titled "Return of 2 PCS (failed testing)".
  Its events are `return-{id}-{eventId}`.
- Repayment events appear on their payment branch, with titles such as "Supplier asked to pay back", "Supplier paid it
  back", "Finance Manager confirmed it arrived" and "Finance Manager: not received".

## 8. Company account: Supplier money (Ecommerce BE)

Procurement feed (internal, `InternalApiKeyFilter`): `GET /v1/internal/finance/supplier-receipts?since=<ISO instant>&limit=200`.
It returns the `APPROVED` repayments (`REFUND`, or a `REVERSAL` of either kind) with `decided_at > since`, oldest
first, on index `(decided_at, id)`:

```json
{ "receipts": [ {
    "receiptId": 12, "postingKey": "PROCUREMENT_SUPPLIER_RECEIPT:12",
    "kind": "REFUND",                    // REFUND | REVERSAL
    "direction": "IN",                   // IN: supplier paid TinQa. OUT: a confirmed refund was reversed (paid back to them)
    "reason": "FAILED_PIECES_RETURN",    // FAILED_PIECES_RETURN | REFUND_CLAIM | PAYMENT_REVERSAL | REFUND_REVERSAL
    "claimCause": "FAILED_TESTING",      // the claim's cause for REFUND_CLAIM / FAILED_PIECES_RETURN, else null
    "orderNumber": "PO-2026-0012", "supplierName": "Acme", "returnId": 3, "milestone": null,
    "amount": 200.00, "chargeAmount": 50.00,
    "method": "BANK_TRANSFER", "reference": "UTR123", "paidOn": "2026-11-07",
    "note": "2 PCS failed testing: no power",  // why: the reversal's reason, or the return's reason
    "receiptFileName": "bank.pdf",       // the supplier's latest receipt file, or null
    "confirmedBy": "fm.user", "confirmedAt": "2026-11-07T10:00:00Z" } ],
  "hasMore": false }
```

Ecommerce BE:
- `ProcurementSupplierReceiptSync` pulls every 60 s, with a cursor and a 10-minute overlap like the purchase sync
  (sync state `PROCUREMENT_SUPPLIER_RECEIPTS`). It stores each receipt once in `supplier_receipts` (V13), by
  `procurement_receipt_id`.
- When `chargeAmount` ≠ 0 it posts a ledger entry with key `postingKey + ":CHARGES"`, category
  `SUPPLIER_CHARGES_RECOVERED` ("Return shipping recovered from suppliers", operating expenses, money in, system) and
  source `PROCUREMENT_SUPPLIER_RECEIPT`; the amount is signed by `direction`. The piece amount and reversals post
  nothing. This is the decision above.
- `GET /api/admin/finance/supplier-receipts?page=0&size=20` (the ledger's read permission) returns a page, newest
  confirmed first:
  ```ts
  interface SupplierReceipt { id: number; procurementReceiptId: number; kind: 'REFUND' | 'REVERSAL'; direction: 'IN' | 'OUT';
    reason: 'FAILED_PIECES_RETURN' | 'REFUND_CLAIM' | 'PAYMENT_REVERSAL' | 'REFUND_REVERSAL'; claimCause: string | null;
    orderNumber: string; supplierName: string; returnId: number | null; milestone: string | null;
    amount: number; chargeAmount: number; total: number; method: string; reference: string | null; paidOn: string;
    note: string | null; receiptFileName: string | null; confirmedBy: string; confirmedAt: string;
    /** The ledger entry of the charge (null when there was none) */ ledgerEntryId: number | null; syncedAt: string }
  ```
- Web UI: Finance › **Supplier money** tab, loaded only when opened, paginated, with an explanation of which part moved
  the balance.
