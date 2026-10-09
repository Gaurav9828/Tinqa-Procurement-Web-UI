# Backend task: an order can be confirmed only when it is fully paid

Service: **TinQa_Ecommerce_BE** (customer orders, payments and order tracking live here; the Procurement
backend has no customer orders or payment status). Read the current code before changing anything.

## Rule

An order may move to **CONFIRMED** or **PRE_ORDER_CONFIRMED** only if it is **100% paid**. Nobody can
bypass this — not an admin (ADMIN_L1/L2) using the admin UI, a direct API call, or any other code path.
Every other payment state (PENDING, FAILED, REFUND_REQUESTED, REFUNDED, CANCELLED, null, anything unknown)
blocks confirmation. Cancelling an unpaid order stays allowed.

"Fully paid" means both:
1. `orders.payment_status = 'PAID'`, and
2. the order's successful payments cover the order total: the sum of `payments.amount` (paise) with
   `status = 'PAID'` for the order is `>= round(orders.total_amount × 100)` and the currency is `INR`.

(2) protects against a `PAID` flag set without a matching captured payment, or an amount mismatch.

## Where to enforce (single choke point)

All admin status changes end in `OrderTrackingServiceImpl.addTrackingStatus(orderNumber, status, notes, updatedBy, …)`
(the private overload). It is reached from:
- `PATCH /api/orders/{orderNumber}/tracking` (update tracking)
- `PATCH /api/orders/{orderNumber}/status` (manual status, via `OrderServiceImpl.updateOrderStatus`)
- `PATCH /api/admin/orders/{orderNumber}/pre-order/approve` (`AdminOrderServiceImpl.approvePreOrder`, → `PRE_ORDER_CONFIRMED`)

Add the check there, **after** loading the order with `findByOrderNumberForUpdate` (row lock) and **before** any
side effects (stock reservation in `reservePreOrderStock`, tracking rows, status change):

```java
private static final Set<String> PAYMENT_REQUIRED_STATUSES = Set.of("CONFIRMED", "PRE_ORDER_CONFIRMED");

if (PAYMENT_REQUIRED_STATUSES.contains(normalizedStatus) && !isFullyPaid(order)) {
    throw new OrderOperationException(
            HttpStatus.CONFLICT,
            "ORDER_PAYMENT_INCOMPLETE",
            "Order " + order.getOrderNumber() + " can't be confirmed until it is fully paid (payment status: "
                    + (order.getPaymentStatus() == null ? "not recorded" : order.getPaymentStatus()) + ").");
}
```

`isFullyPaid(order)` implements the two conditions above using `PaymentRepository`
(`findByOrderIdAndStatusIn(orderId, List.of("PAID"))` or a dedicated sum query).

### Also block skipping confirmation
If the backend does not already enforce the status transition table, an admin could jump straight from
`ORDER_RECEIVED` to `PROCESSING`/`PACKED`/… and skip confirmation. Either enforce the transition table
(see the UI's `statusWorkflow.ts` NEXT_STATUSES), or apply the same payment check to every fulfilment status:
`CONFIRMED, PRE_ORDER_CONFIRMED, PROCESSING, PACKED, OUT_FOR_DELIVERY, DELIVERED`. Recommended: do both.
Return/cancel statuses are not affected.

## Do not change
- Customer checkout and Razorpay flows (`RazorpayPaymentService`): payment verification/webhooks set
  `payment_status`; they must not confirm the order themselves unless that is already the case.
- Cancellation, refund-request and restock behaviour.
- Pre-order stock checks (`PRE_ORDER_STOCK_NOT_READY`) — keep them; the payment check runs first so an
  unpaid pre-order never reserves stock.

## Optional (helps the UI)
Add `canConfirm: boolean` (and/or `paymentComplete: boolean`) to `AdminOrderDetailDTO` /
`AdminOrderSummaryDTO`, computed with the same `isFullyPaid`, and include payment in `canApprovePreOrder`
(`PRE_ORDER_PENDING && preOrderReady && isFullyPaid`). The UI currently decides from `paymentStatus === 'PAID'`
and would switch to the server's flag.

## Error contract (the admin UI shows `message` as a toast)
`409 CONFLICT`, `errorCode: "ORDER_PAYMENT_INCOMPLETE"`, `message` as above, `errors: []`, no state changed.

## Existing data
Older orders were created with `payment_status = 'PAID'` as a default even without a payment row. With
condition (2) those can no longer be confirmed. Decide before release: either backfill/verify them, or
apply (2) only to orders created after this change (e.g. orders that have any `payments` row). Report how
many confirmable-but-unpaid orders exist today.

## Tests
- CONFIRMED with payment_status PENDING / FAILED / REFUND_REQUESTED / null → 409, no tracking row, status unchanged.
- PAID flag but no PAID payment row, or PAID amount < total → 409.
- Fully paid → CONFIRMED succeeds via both `/tracking` and `/status`.
- Pre-order approve, unpaid → 409 and **no stock reserved**; paid + stock ready → PRE_ORDER_CONFIRMED.
- Skipping: ORDER_RECEIVED → PROCESSING (unpaid) → rejected.
- CANCELLED on an unpaid order still works.
- Concurrency: the check runs under the order row lock.

## Acceptance
- No API call, from any admin role, can confirm or approve an order that is not fully paid.
- The admin UI already hides "Confirmed" and disables "Approve pre-order" for unpaid orders; the backend
  returns `409 ORDER_PAYMENT_INCOMPLETE` if anything still tries.
