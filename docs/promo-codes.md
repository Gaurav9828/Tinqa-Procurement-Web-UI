# Promo codes

Built 2026-11-04 across all four services. The Super Admin creates promo codes in the Web UI. A code can be for
every customer or for chosen customers, and for every product or for chosen products. It gives a percentage or a fixed amount
off each unit, on at most a set number of units of each product, between two dates, a set number of times. Senior staff can see
the codes, so they can tell customers which code to use, but cannot change them; a code for chosen customers they see
only as `TINQA***************`, and they email it to those customers instead (V40). A code for every customer can be
put on the storefront, where every visitor sees it. On the storefront, the promo code box appears at checkout only for
a customer who has a code they can use. Apart from those storefront offers the storefront never suggests or shows a
code: the customer types the one they were given. Every use is kept with its order and the discount it gave.

| Service | Owns |
| --- | --- |
| Ecommerce BE | All promo data and endpoints (`/api/promo-codes/**` customers, `/api/promo-offers` public, `/api/admin/promo-codes/**` staff), pricing with a promo, the use history, the masking, the share emails |
| Procurement BE | The permissions (`PROMO_CODE_VIEW` in group `PROMO_CODE_READ`, `PROMO_CODE_SHARE` in `PROMO_CODE_MANAGEMENT`, `PROMO_CODE_MANAGE` in `SYSTEM_ADMINISTRATION`) |
| Web UI | Promo Codes page (`/promo-codes`): list, detail and use history for viewers; email and storefront for sharers; create, edit, switch off, delete and restore for the Super Admin |
| Storefront | The offers banner on every page, the promo code box at checkout (with the offers), the discount in the order summary, order details and invoice |

## Permissions (Procurement catalog; the Ecommerce `Permission` mirror and the UI `access.ts` use the same names)

| Permission | Group | Who (by designation) |
| --- | --- | --- |
| `PROMO_CODE_VIEW` | `PROMO_CODE_READ` | Super Admin, Store Manager, Store Sales Agent, Customer Support, Finance Manager, Financial Auditor |
| `PROMO_CODE_SHARE` | `PROMO_CODE_MANAGEMENT` | Super Admin, Store Manager, Store Sales Agent, Customer Support |
| `PROMO_CODE_MANAGE` | `SYSTEM_ADMINISTRATION` (Level 2 only, never in a custom role) | Super Admin |

## Rules

- **Code** (V40). `TINQA` followed by 15 to 25 random capital or small letters, no digits (`^TINQA[A-Za-z]{15,25}$`,
  20 to 30 characters), compared exactly: the letters' case matters, only the `TINQA` prefix may be typed in any case
  (it is put in capitals). The server suggests a unique one (`TINQA` + 15 random letters, no look-alike `I l O`). The
  Super Admin may type their own instead; it must be unique whatever its case (409 `PROMO_CODE_TAKEN`; index
  `uq_promo_codes_code_lower`), deleted codes included. Codes made before V40 (`TINQA` + 3 to 15 capitals or digits)
  keep working and are still found when typed in small letters; no new code has that shape. Once created, the code
  itself never changes (used or not); everything else can: discount, customers, products and their units, limits,
  dates, on/off. Changes apply to later orders only.
- **Discount.** Either a percentage or an amount, never both (`discountType` `PERCENTAGE` or `AMOUNT`):
  - a percentage off the list price, more than 0 and below 100 (at most 99.99: an order is never free, since an online
    payment cannot be opened for ₹0);
  - an amount in rupees (`amountOff`, more than 0, at most 1,000, two decimals) off the list price of **each unit** the
    promo works on. An amount as big as a product's list price does nothing on it (a unit is never free).

  Either **replaces** the product's own discount; it is never added to it. List price ₹1,000 with 5 % off and a 20 %
  (or ₹200) promo: the unit costs ₹800, not ₹750. If the product's own discount is already as big or bigger (₹30 off
  against 5 % off ₹1,000), the promo does nothing on that product (the customer never pays more because of a promo).
- **Customers.** `ALL` (any signed-in customer) or `SELECTED` (only the customers chosen; at least one).
- **Products.** `ALL` or `SELECTED` (at least one).
- **Units.** On how many units of a product in one order the promo works; empty = every unit. With 1, three RudraX in
  the cart get the promo on one RudraX; the other two keep their normal price. Products `SELECTED`: each chosen
  product has its own number (`products[].maxUnits`, "All units" or a number ≥ 1 in the form, right after the product).
  Products `ALL`: one number for every product (`maxUnitsPerProduct`). Codes made before V38 with chosen products
  moved their one number onto each chosen product.
- **Bundle discounts** (accessory bought with its parent) are not added on top of a promo either: units with the promo
  get only the promo, and the bundle rule pairs only the remaining units.
- **Dates.** `startsOn` to `expiresOn`, both days included, India time (the server clock). The UI offers presets
  (6 months, 1 year, 2 years) and a custom range.
- **Uses.** One use = one order. `usageLimitPerCustomer`: how often one customer may use it (empty = no limit; 1 = one
  time). `totalUsageLimit`: how often it may be used by everyone together (empty = no limit). A cancelled order gives
  its use back, however it was cancelled (by the customer, by staff, by an address-change replacement or because it
  was left unpaid): the move to `CANCELLED` releases it. A delivered or returned order keeps it. Uses are counted under a row lock on the promo, so two orders
  at once cannot go over a limit.
- **One promo per order.**
- **Switched off** (`active = false`): nobody can use it; it can be switched back on.
- **Deleted** (soft, `deleted_at` set): nobody can use it (the same `PROMO_CODE_INVALID` as a missing code), the list
  hides it unless the status filter is `DELETED`, and edits and the on/off switch answer 409 `PROMO_CODE_DELETED` until
  it is restored. The row stays: orders and the use history name it, and its code stays taken. Restoring brings it
  back as it was (switched on or off). Deleting a deleted code, or restoring a live one, changes nothing.
- **Address-change replacement.** The replacement order may carry the replaced order's code again. The replaced
  order's own use does not count against the limits, so a one-time code survives the replacement.
- **Store sales** (orders booked by an agent) do not take promo codes yet.

- **Who sees a code** (V40; `PromoCodeVisibility`, the only place this rule lives). A code for every customer: everyone
  with `PROMO_CODE_VIEW`. A code for chosen customers: in full only to `PROMO_CODE_MANAGE` (the Super Admin); everyone
  else gets `code` = `TINQA***************` (always 15 stars, whatever its length) and `codeHidden: true`, in the list,
  the detail, the answers of share and storefront, and in admin order details (`promoCode`). Their search matches a
  hidden code only by text no longer than `TINQA`, so it can't spell a code out letter by letter. The customer's own
  order, invoice and emails show their code in full.
- **Sharing by email** (`PROMO_CODE_SHARE`). Only a code for chosen customers, only while it is `ACTIVE` or `SCHEDULED`,
  only to its own customers (some or all). Each customer gets one email (`PROMO_CODE_SHARE` outbox kind, template
  `promo-code-share`) with the code, its description as its purpose, the discount, the products, the dates and the uses
  per customer. The outbox keeps only ids; the code is read when the email is built, and the email is dropped if the
  code was deleted, switched off, ended or no longer for that customer before it went out. Every share is kept in
  `promo_code_shares` and the detail shows each customer's `timesShared` and `lastSharedAt`. Sharing again sends again.
- **Storefront offers** (`PROMO_CODE_SHARE`). Only a code for every customer can be shown (`shownOnStorefront`), and
  only switched on while `ACTIVE` or `SCHEDULED`; switching it off is always allowed. Every visitor (signed in or not)
  sees the shown codes that anyone could use today (switched on, not deleted, inside their dates, total limit not
  reached), at most 3, ending soonest first: in a banner on every page and in the checkout's promo box, where "Use"
  applies it. A code narrowed to chosen customers by an edit stops being shown.

Status shown to staff, worked out on the server: `DELETED`, `DISABLED` (switched off), `SCHEDULED` (before `startsOn`), `EXPIRED`
(after `expiresOn`), `USED_UP` (`totalUsageLimit` reached), else `ACTIVE`.

### Errors the customer can get (HTTP 400, `errorCode`)

| Code | When |
| --- | --- |
| `PROMO_CODE_INVALID` | No such code, switched off, or not for this customer (one message for all three, so codes can't be guessed) |
| `PROMO_CODE_NOT_STARTED` | Before `startsOn` |
| `PROMO_CODE_EXPIRED` | After `expiresOn` |
| `PROMO_CODE_USED_UP` | The customer's or the total use limit is reached |
| `PROMO_CODE_NOT_APPLICABLE` | None of the cart's products get anything off with it |

Staff (HTTP 409): `PROMO_CODE_NOT_SHAREABLE` when an everyone code is emailed, a chosen customers' code is put on the
storefront, or the code is switched off, expired or used up; `PROMO_CODE_DELETED` for a deleted one.

`POST /api/orders` with a code that fails any of these answers the same error; nothing is reserved.

## API (Ecommerce BE). Every response is the usual `ApiResponse` envelope; `data` is shown.

### Customers (customer token)

`GET /api/promo-codes/availability` → `{ "available": true }`
True when at least one switched-on code inside its dates, not used up, is for everyone or for this customer. Never
says which code. One SQL statement.

`POST /api/promo-codes/apply`
```json
{ "code": "TINQAhRtKwPzMbQeNcYvD", "items": [{ "productId": 12, "quantity": 3 }], "replacesOrderNumber": null }
```
The answer carries `discountType` and the one value that goes with it (`discountPercentage` or `amountOff`, the other
null); the storefront shows "20% off" or "₹200 off each".
→ the order priced with the code, exactly as `POST /api/orders` would price it now:
```json
{
  "code": "TINQAhRtKwPzMbQeNcYvD",
  "discountPercentage": 20.00,
  "discountAmount": 150.00,
  "subtotal": 2700.00,
  "shippingFee": 0.00,
  "totalAmount": 2700.00,
  "lines": [{
    "productId": 12, "title": "RudraX", "quantity": 3,
    "unitPrice": 950.00, "promoQuantity": 1, "promoUnitPrice": 800.00,
    "promoDiscountAmount": 150.00, "bundleDiscountAmount": 0.00, "totalPrice": 2700.00
  }]
}
```
`subtotal` is the sum of line `totalPrice`s (already less the promo); shipping is charged on it. `discountAmount` is
what the promo took off compared with the normal price.

`POST /api/orders` takes `"promoCode": "TINQAhRtKwPzMbQeNcYvD"` next to the existing fields. `totalAmount` sent by the client
must then be the promo total (else 409 price changed, as today).

Order responses (`/api/orders`, `/api/admin/orders`, …) add `promoCode` (null when none) and `promoDiscountAmount`;
each item adds `promoQuantity` and `promoDiscountAmount` (its `totalPrice` already excludes it).

### Staff

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/admin/promo-codes?search=&status=&page=0&size=20` | `PROMO_CODE_VIEW` |
| GET | `/api/admin/promo-codes/{id}` | `PROMO_CODE_VIEW` |
| GET | `/api/admin/promo-codes/{id}/redemptions?page=0&size=20` | `PROMO_CODE_VIEW` |
| GET | `/api/admin/promo-codes/code-suggestion` | `PROMO_CODE_MANAGE` |
| POST | `/api/admin/promo-codes` | `PROMO_CODE_MANAGE` |
| PUT | `/api/admin/promo-codes/{id}` | `PROMO_CODE_MANAGE` |
| PATCH | `/api/admin/promo-codes/{id}/status` body `{ "active": false }` → the detail | `PROMO_CODE_MANAGE` |
| DELETE | `/api/admin/promo-codes/{id}` → the detail (status `DELETED`) | `PROMO_CODE_MANAGE` |
| POST | `/api/admin/promo-codes/{id}/restore` → the detail | `PROMO_CODE_MANAGE` |
| POST | `/api/admin/promo-codes/{id}/share` body `{ "customerIds": [7] }` (null or empty: all its customers) → the detail | `PROMO_CODE_SHARE` |
| PATCH | `/api/admin/promo-codes/{id}/storefront` body `{ "shown": true }` → the detail | `PROMO_CODE_SHARE` |

Public: `GET /api/promo-offers` (no token) → `[{ "code", "description", "discountType", "discountPercentage",
"amountOff", "productScope", "productTitles": ["RudraX"], "expiresOn" }]`, `Cache-Control: max-age=60, public` and an
ETag (a repeat visit is a 304). No server cache: it reads only the few shown codes (`idx_promo_codes_storefront`), and a
cache key would have to cover every order's use of them.

`search` matches codes starting with the text (case ignored). `status` is one of `ACTIVE`, `SCHEDULED`, `EXPIRED`,
`DISABLED`, `DELETED` (empty = all but the deleted ones; every other filter leaves them out too). Page size at most 100. Lists are `PageResponse` (`content`, `number`, `size`,
`totalElements`, `totalPages`, `first`, `last`, `empty`), newest first.

List row (`PromoCodeSummaryDTO`):
```json
{
  "id": 1, "code": "TINQAhRtKwPzMbQeNcYvD", "codeHidden": false, "description": "Diwali offer",
  "discountType": "PERCENTAGE", "discountPercentage": 20.00, "amountOff": null,
  "customerScope": "SELECTED", "customerCount": 2, "productScope": "SELECTED", "productCount": 1,
  "maxUnitsPerProduct": 1, "usageLimitPerCustomer": 1, "totalUsageLimit": null,
  "startsOn": "2026-11-04", "expiresOn": "2027-05-03", "active": true, "shownOnStorefront": false, "status": "ACTIVE",
  "timesUsed": 3, "totalDiscountGiven": 450.00,
  "createdBy": "superadmin", "createdAt": "2026-11-04T10:00:00",
  "updatedBy": null, "updatedAt": "2026-11-04T10:00:00", "deletedBy": null, "deletedAt": null
}
```
`timesUsed` and `totalDiscountGiven` count only orders that were not cancelled. `maxUnitsPerProduct` is null for
products `SELECTED` (each product's own number is in the detail).

Detail (`PromoCodeDetailDTO`) = the row plus
`"customers": [{ "id": 7, "name": "Asha Rao", "email": "asha@example.com", "timesShared": 1, "lastSharedAt": "2026-11-04T11:00:00" }], "products": [{ "id": 12, "title": "RudraX", "maxUnits": 1 }]`
(`maxUnits` null = every unit)
(empty lists for scope `ALL`).

Create / edit body (`PromoCodeRequestDTO`):
```json
{
  "code": "TINQAhRtKwPzMbQeNcYvD", "description": "Diwali offer", "discountType": "PERCENTAGE", "discountPercentage": 20, "amountOff": null,
  "customerScope": "SELECTED", "customerIds": [7, 9], "productScope": "SELECTED",
  "products": [{ "productId": 12, "maxUnits": 1 }, { "productId": 14, "maxUnits": null }],
  "maxUnitsPerProduct": null, "usageLimitPerCustomer": 1, "totalUsageLimit": null,
  "startsOn": "2026-11-04", "expiresOn": "2027-05-03", "active": true
}
```
Answers the detail. `discountType` null means `PERCENTAGE`; the value of the other kind must be null (else 400 on
that field). `products` is read only for products `SELECTED` (a product listed twice: the first entry counts),
`maxUnitsPerProduct` only for `ALL`. On an edit `code` must be the saved code (or left out): any other is 400 `code`.
Validation errors are 400 with the field name (`code`, `discountPercentage`, `customerIds`, `products`,
`maxUnitsPerProduct`, `usageLimitPerCustomer`, `totalUsageLimit`, `expiresOn`, `amountOff`). `expiresOn` must not be
before `startsOn`, nor (on create) before today. Limits are whole numbers ≥ 1 or null. Customer and product ids must
exist (customers: storefront accounts not deleted). At most 500 customers and 500 products per code.

`code-suggestion` → `{ "code": "TINQAhRtKwPzMbQeNcYvD" }` (unused at the time of the call).

Use history row (`PromoRedemptionDTO`), newest first:
```json
{
  "id": 4, "orderNumber": "ORD-1A2B3C4D", "customerId": 7, "customerName": "Asha Rao",
  "customerEmail": "asha@example.com", "unitsDiscounted": 1, "amountBeforeDiscount": 2850.00,
  "discountAmount": 150.00, "orderTotal": 2700.00, "orderStatus": "DELIVERED",
  "counted": true, "redeemedAt": "2026-11-04T10:00:00"
}
```
`amountBeforeDiscount` is the items' subtotal without the promo; `orderTotal` is what the order cost (with
shipping). `counted` is false for cancelled orders (their use was given back).

## Data (Ecommerce V37, V38, V39)

`promo_codes`, `promo_code_customers (promo_code_id, user_id)`, `promo_code_products (promo_code_id, product_id)`,
`promo_code_redemptions` (one row per order, unique `order_id`; `released_at` is set when the order is cancelled, and
only rows without it count as uses). `orders.promo_code`, `orders.promo_discount_amount`,
`order_items.promo_quantity`, `order_items.promo_discount_amount`.

V38: `promo_codes.deleted_at`, `deleted_by` (soft delete; `idx_promo_codes_live` now also leaves deleted codes out),
`promo_code_product_units (promo_code_id, product_id, max_units ≥ 1)`: the cap of a chosen product; a chosen product
without a row works on every unit.

V40: `promo_codes.code` and `orders.promo_code` up to 30 characters; the format check allows both shapes;
`uq_promo_codes_code_lower` (unique `lower(code) text_pattern_ops`: case-insensitive uniqueness and the prefix search)
replaces `idx_promo_codes_code_prefix`; `promo_codes.shown_on_storefront` (only with customer scope `ALL`, checked),
`storefront_changed_by`, `storefront_changed_at`, partial index `idx_promo_codes_storefront`; `promo_code_shares
(promo_code_id, user_id, shared_by, shared_at)`.

V39: `promo_codes.discount_type` (`PERCENTAGE` for every earlier code), `amount_off`; `discount_percentage` may be
null. A check keeps exactly the value of the code's type set.
