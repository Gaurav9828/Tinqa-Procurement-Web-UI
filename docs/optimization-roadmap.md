# Optimization roadmap: database calls, API calls and cost

This roadmap covers all four services. It comes from an audit of the four codebases done on 2026-10-28, and it is
worked through one phase at a time. The rules each phase must follow are in `docs/engineering-rules.md`. In this
file, "statements" means SQL statements.

Status: **done**, **next**, or **planned**.

## Phase 1: Approvals Hub badges (done, 2026-10-28)

**Before**

- Opening `/approvals` made 16 calls: 13 queue lists downloaded only to count them, plus 3 app-shell calls.
- That was about 40–60 SQL statements per visit.
- Every tab click fired 8 or more calls.

**What changed**

- Procurement BE, migration V15:
  - new function `approval_queue_counts(text[])`;
  - composite indexes that match the queues' order: orders, employees, profile changes, product approvals, dealer
    logins, client demos and documents;
  - a partial index for the stock approval queue;
  - the missing `document` uploader index.
- Procurement BE, endpoint `GET /v1/approvals/summary`. It counts 12 queues, each filtered by the caller's
  permissions.
- Ecommerce BE, migration V30 and `GET /api/admin/approvals/summary`. It counts refunds, expenses, pre-orders and
  company profile changes. A composite index on `orders(order_status, created_at, id)` replaces the plain status
  index.
- Web UI: tab badges come from the two summary calls, and a tab loads its list only when it is opened. A tab click
  refreshes only the summary.

**After**

- Opening `/approvals` makes 11 calls. 6 of them are the Requests tab's lists, which phase 1b removes.
- A tab click makes 1–3 calls.
- Each badge costs one SQL statement per backend.

## Phase 1b: Requests tab in one call (next)

- New endpoint `GET /v1/approvals/requests` returns the documents, profile changes, stock, orders, products and
  employees queues the caller decides, as one typed list. It replaces the 6 calls `useApprovals` makes.
- It also replaces the refetch of every queue after each decision.
- Expected result: `/approvals` drops from 11 calls to 6.

## Phase 2: Cost of every Procurement request (planned)

Each request currently costs 2–3 SQL statements and 1 Redis round-trip before the controller runs:

- `JwtAuthenticationFilter` looks up the user;
- `AccessResolver` looks up the employee;
- `CurrentUserProvider` looks up the user again.

The plan:

- Cache the resolved user, designation and `UserAccess`. Keep them for 30–60 s, and evict them when the
  designation, role, enabled flag or password changes.
- Make `CurrentUserProvider` read the authenticated principal instead of querying again.
- This makes every endpoint cheaper.

## Phase 3: Storefront session payload (planned, Ecommerce BE + storefront)

**Problem:** `UserResponseAssembler` puts the customer's whole order history into the response of
`/api/auth/me`, login, every cart add, update and remove, and order placement.

**Plan**

- Return only the user, addresses and cart from those calls.
- Load orders separately, paginated, from `GET /api/orders?page=`.
- Make `getPaymentPendingOrders` filter in SQL.

## Phase 4: Missing indexes (planned)

**Ecommerce**

- `order_items(product_id)`
- `product_specifications(product_id)`
- `finance_ledger_entries(account_id, occurred_on) INCLUDE (amount_paise, cash_impact)`
- `orders(user_id, created_at DESC, id DESC)`
- `pg_trgm` indexes for order, voucher and ledger search, and stop binding `'%'` when there is no search term

**Procurement**

- `lower(dealers.email)`, used on every dealer-portal orders call
- `pg_trgm` indexes for dealer, item and employee search

## Phase 5: Paginate and project unbounded lists (planned)

- **Procurement:**
  - the queue lists: product approvals, employees, profile changes, dealer logins, change requests, barcode requests
    and demos;
  - `GET /v1/orders`, `GET /v1/stocks`, `GET /v1/documents`;
  - each as a DTO projection without the JSON columns.
- **Ecommerce:** `/api/products` and `/api/products/active`, served from cache (see phase 8).

## Phase 6: Reports in SQL (planned)

These reports load records and total them up in Java today. Each becomes a SQL function or rollup.

- **Payroll year and month summaries** (`PayrollService.yearSummary` and `monthView`): today they load every
  employee 12 times. Replace with a function.
- **Profit summary and product profit** (`ProfitService`): replace with an aggregate function.
- **GST summary and finance overview** (`GstReportService`, `FinanceReportService`): today they aggregate the
  whole history on every call. Replace with monthly rollups, as a materialized view refreshed on posting or by the
  sync job. This also makes the ledger integrity check cheap.

## Phase 7: Configuration (planned)

- **Ecommerce:**
  - `spring.jpa.open-in-view=false`;
  - `show-sql=false` in the base properties file;
  - add `@Transactional(readOnly = true)` to product and customer-order reads.
- **Both backends:**
  - size the Hikari pool explicitly;
  - set `hibernate.jdbc.batch_size`, `order_inserts` and `order_updates`;
  - use pooled SEQUENCE ids on bulk-insert tables.
- **Procurement:** send notification broadcasts as one `INSERT ... SELECT`.

## Phase 8: Caching (planned)

- **Ecommerce:** cache the company profile and the active catalogue. Use Caffeine, evicted on approval or product
  change, and serve them with `ETag` and `Cache-Control`.
- **Procurement:** cache reference data (access catalog, categories, dealer cities, staff options) in Redis for
  5–15 minutes, evicted on writes.

## Phase 9: Calls between services (planned)

- The three finance sync jobs call Procurement every 60 s, about 4,300 calls a day even when nothing changed. Add a
  cheap "anything new since cursor X?" check, or a longer interval.
- Move the item-stock HTTP calls out of database transactions by using an outbox.

## Phase 10: Storefront calls (planned)

- One `GET /storefront/bootstrap` returning the company profile, catalogue and session. It replaces 5 boot calls.
- One call per product popup, returning the review summary, first review page and eligibility. It replaces 3.
- One refresh after payment. It replaces a chain of 4–5 calls.
- A batch call for the payment-pending alert, instead of one call per order.
- Ticket polling through a delta endpoint.

## Phase 11: Web UI calls (planned)

- **Session bootstrap:** access, unread count and badges in one call. Keep the `permissions` array reference
  stable in `setAccess`, so access refreshes do not refetch pages.
- **Lookups endpoint:** id and name only, replacing the `size=1000` dealer and item lists.
- **Products list:** the latest approval status included.
- **Product component rows:** one batch call for their details, replacing 3 calls per row.
- **Order tracking:** the order detail includes its refunds and the tracking statuses.
- **Customer:** one overview call.
