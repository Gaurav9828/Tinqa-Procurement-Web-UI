# Backend task: product components consume item stock

Services: **TinQa_Ecommerce_BE** (products) and **TinQa_Procurement_Backend** (items, stock).
Read the current code before changing anything; the class/endpoint names below are what exists today.

## Goal

A product's `components` list is now its **bill of materials for ONE unit** (e.g. 1 product = 2 × Motherboard + 1 × Cable).
Item stock (Procurement) must move with product stock (Ecommerce):

- Creating a product builds **exactly 1 unit** → consume `componentQty × 1` of every component item.
- Admin **increases** product stock by N → consume `componentQty × N` of every component item.
- Admin **decreases** product stock by N → return `componentQty × N` to item stock.
- All-or-nothing: if any component item lacks stock, nothing changes and the request fails with a clear error.

## What already exists (reuse it)

- Ecommerce: `product_components` / `product_component_warranties` (migration `V2__add_product_components.sql`),
  `ProductRequestDTO.components`, `ProductService.saveComponents/replaceComponents`. On update, `components`
  omitted/null = untouched; a list = replaces all. Keep these semantics.
- Procurement: `StockServiceImpl.getItemAvailability(itemId)` (consumable = active + APPROVED + order DELIVERED + units > 0),
  `consumeItemStock(item, qty, userId)` (FIFO by arrival, pessimistic locks, throws `InsufficientStockException`),
  `restoreStock(Map<stockId, units>, userId)`, and the `product_stock_allocations` pattern used by Procurement products.

## What the admin UI now sends (contract you must accept)

- `POST /api/products`: `stockQuantity` is always `1`. `components[].quantity` is a whole number ≥ 1, chosen from
  1…available (the UI already caps it by `GET /v1/stocks/items/{itemId}/availability`).
- `PUT /api/products/{id}` (full payload, as today):
  - Stock add/reduce dialog: same fields, `stockQuantity` = old ± N, `lastUpdateDescription` like
    `Stock added: +2 (3 → 5) — reason`, and **no `components` key**.
  - Edit form: for products with components the stock field is read-only, so `stockQuantity` is unchanged;
    `components` is sent only when the admin changed them.
- The UI caps "Add stock" at `min(floor(available_i / qty_i))` and re-checks right before saving, but the
  backend is the source of truth (races between admins are expected).

## Required changes

### 1. Validation (Ecommerce)
- Create: reject `stockQuantity != 1` → 400 `PRODUCT_INITIAL_STOCK_MUST_BE_ONE`.
- `components[].quantity`: whole number ≥ 1 (currently decimals are allowed) → 400 with field error `components[i].quantity`.

### 2. Item-stock movements on every admin change (Ecommerce → Procurement)
Compute per-item deltas for the request (positive = consume, negative = return):

| Change | Delta per component item |
|---|---|
| Create (stock 1) | `+qty × 1` |
| Stock `S → S'` | `qty × (S' − S)` |
| Component qty `q → q'` while stock is `S` | `(q' − q) × S` |
| Component added / removed while stock is `S` | `+q' × S` / `−q × S` |

Combine all deltas of one request into one movement. Use the **unsold units in stock (S)** for component edits — sold
units already left with their items.

**Do NOT move item stock for customer flows**: order placement decreasing product stock, cancellations/returns restoring
it, pre-order approval. Only admin create/update/stock-adjust paths move item stock. (`OrderServiceImpl`,
`OrderTrackingServiceImpl`, `AdminOrderServiceImpl` must stay as they are.)

### 3. Procurement: internal movement API
Products and items are in different databases, so this is a cross-service call. Add an internal, service-authenticated
endpoint (shared secret/client credentials, not the admin JWT):

```
POST /v1/internal/item-stock/movements
{ "movementId": "uuid", "source": "ECOMMERCE_PRODUCT", "reference": "product:42",
  "lines": [ { "itemId": 7, "quantity": 4 }, { "itemId": 8, "quantity": -2 } ],
  "performedBy": "admin@tinqa.com" }
```
- Positive lines consume FIFO via `consumeItemStock`; negative lines return units to the batches previously consumed for
  the same `reference` (LIFO), via `restoreStock`. Do all lines in one transaction with row locks.
- Persist allocations per movement (new table, e.g. `item_stock_movements` + `item_stock_movement_allocations`:
  movement_id UNIQUE, reference, item_id, stock_id, units ±, created_at, performed_by).
- **Idempotent** on `movementId` (a retry returns the original result, never double-consumes).
- Insufficient stock → 409 `INSUFFICIENT_ITEM_STOCK`, message like
  `Not enough stock for Motherboard: need 4, available 2`, and `errors: [{ field: "lines[0].quantity", message }]`.
- `POST /v1/internal/item-stock/movements/{movementId}/reverse` for compensation (idempotent).
- Returning more than was ever consumed for a reference → 400 (never create stock out of nothing).

### 4. Ecommerce: apply safely
- New table `product_stock_movements` (id, product_id, movement_id UUID UNIQUE, kind CREATE|STOCK_CHANGE|COMPONENT_CHANGE,
  product_stock_delta, lines JSON, status PENDING|APPLIED|REVERSED|FAILED, error, created_by, created_at).
- Flow per admin request: validate → compute lines → save movement PENDING → call Procurement → save product changes and
  mark APPLIED in one local transaction. If the local transaction fails after Procurement succeeded → call `reverse`.
  If the Procurement call times out → retry with the same `movementId`; if still unknown mark FAILED and surface it.
- Map Procurement's 409 to an Ecommerce 409 `INSUFFICIENT_ITEM_STOCK` with the same message/errors (the UI shows the
  message as a toast and keeps the dialog open).
- No movement lines (no components, or nothing changed) → no Procurement call.

### 5. Read endpoints the UI would use
- `GET /v1/stocks/items/availability?itemIds=7,8,9` (and/or `?inStockOnly=true`) → `[{ itemId, totalAvailableUnits }]`
  using the same consumable rules as `getItemAvailability`. The UI currently approximates the "in stock" item list from
  `GET /v1/stocks`, which can't see order delivery status.
- Optional but recommended: `PATCH /api/products/{id}/stock { "delta": 2, "reason": "..." }` so stock changes don't need
  the full product payload (the UI uses PUT today and can switch).

### 6. Existing data
Products created before this change have no movements. Do not consume item stock retroactively: only future changes
move item stock. Returns must never exceed what a product actually consumed (see §3).

## Open decisions (confirm with product owner)
- Should "Reduce stock" always return items to stock? Damaged/scrapped units probably should not. Suggest an optional
  `returnItemsToStock` flag (default `true`) on the stock change; the UI can add a checkbox.
- Should component edits be blocked while unsold stock exists, instead of moving `(q' − q) × S`?

## Tests (both services)
- Create with components consumes `qty × 1`; insufficient stock → 409 and no product row.
- Stock +N / −N consumes / returns `qty × N`, FIFO / LIFO by batch; all-or-nothing across items.
- Component add/remove/qty change with stock S moves the right amounts; unchanged/omitted components move nothing.
- Customer order, cancellation, return and pre-order approval never call the movement API.
- Movement API is idempotent on `movementId`; `reverse` restores exactly what was taken; over-return → 400.
- Concurrency: two admins adding stock at once cannot oversell an item (row locks).
- Create with `stockQuantity` ≠ 1 → 400; decimal component quantity → 400.

## Acceptance
- Item with 4 units; product uses 2 per unit → create (uses 2, 2 left) → add 1 (0 left) → add 1 fails with 409 and nothing
  changes → reduce 1 (2 back) → item shows 2 available in `GET /v1/stocks/items/{id}/availability`.
- A customer buying that product does not change item stock.
