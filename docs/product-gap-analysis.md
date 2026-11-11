# TinQa product gap analysis (2026-11-09)

This report compares the four TinQa services with large online stores (Amazon, Flipkart) and with companies that
sell their own products direct to customers (Apple, OnePlus, boAt):

- Ecommerce BE
- Storefront (Ecommerce FE)
- Procurement BE
- Admin Web UI

It is based on a read-only audit of all four codebases. The comparison uses public, well-known features of those
companies; no web research was done for this version.

Work on database and API call counts is already planned in `docs/optimization-roadmap.md` and is not repeated here.

**Criticality**

| Level | Meaning |
|---|---|
| **P0** | Fix before go-live. Security, money, data correctness, or a legal problem. Usually small. |
| **P1** | Large business impact. Customers or staff will notice it is missing. |
| **P2** | Clear improvement. Plan it. |
| **P3** | Nice to have, or only needed when the business grows. |

`✔ verified` means the finding was checked again in the code after the audit.

---

## 1. Summary

**The back office is ahead of most young D2C brands. The storefront, logistics and platform hardening are behind.**

What is already strong (often stronger than Shopify-level stores):

- Maker-checker approvals across the business.
- GST-correct invoices and credit notes.
- Real Razorpay payments, with webhooks, refunds to the original payment, and idempotent payment recording.
- Pessimistic locking that prevents overselling.
- Barcodes on every unit.
- A full finance suite: ledger, P&L, GST register, payroll.
- A supplier portal.
- Quality gates: coverage, SpotBugs, a secrets scan, CSP headers, and API-call budgets.

What is missing compared with Amazon, Flipkart and Apple:

1. **Discovery.** There is no product page URL, no search, no filters or sort, and no SEO. Google cannot index the
   products and customers cannot share them.
2. **Logistics.** There is no courier integration, no AWB or live tracking, no pincode delivery estimate, and no
   COD. COD is still a large share of Indian online orders.
3. **After-sales for your own product.** There is no warranty registration or claims. Unit serials are not linked to
   the customer who bought them. Customers cannot start a return themselves, even though the backend supports it.
4. **Platform hardening.** There is no login lockout or 2FA for admins, and observability is weak (no metrics, no
   tracing, no error tracking). The prod configuration also has some gaps.
5. **Admin productivity.** There is no sales or inventory dashboard outside finance, no CSV export or import, no
   audit log viewer, no warehouses, and no low-stock alerts.

---

## 2. Scorecard by area

| Area | TinQa today | What Amazon/Flipkart/Apple do | Rating |
|---|---|---|---|
| Sign-up / sign-in | Email code, password links, httpOnly cookie, session version | + phone OTP, social login, passkeys | Good |
| Catalogue | Categories, specs, 5 image slots, versions, accessories | + variants, compare, video/360, PDP URLs | Weak |
| Search & discovery | None | Autocomplete, facets, sort, typo tolerance | **Missing** |
| Product page (PDP) | Modal only, no URL | Shareable, SEO page with JSON-LD | **Missing** |
| Cart | Server cart, login required | Guest cart, save for later, wishlist | Fair |
| Checkout | Server pricing, promo codes, GST, pre-order | + COD, EMI display, guest, saved addresses, gift | Good, narrow |
| Payments | Razorpay with webhooks, refunds, 15-min expiry | + COD, settlement reconciliation | Good |
| Order tracking | ~40 statuses set by hand, timeline | Courier AWB, live scans, ETA, SMS/WhatsApp | Fair |
| Returns / exchange | Backend complete; storefront can only show it | Self-serve return, pickup booking, exchange | **Partial** |
| Warranty / after-sales | Warranty terms shown | Device registration, coverage check, claims, repairs, extended warranty | **Missing** |
| Reviews | Verified purchase only, moderation, histogram | + photos, helpful votes, Q&A, brand replies | Good |
| Promotions | Rich promo codes with maker-checker | + gift cards, loyalty, bank offers | Good |
| Notifications | Email outbox, in-app (admin) | + SMS, WhatsApp, push, back-in-stock, abandoned cart | Fair |
| Support | Tickets with duplicate detection, rule-based assistant | + FAQ/help centre, chat, callback | Good |
| Invoicing / GST | Gapless tax invoices, credit notes, GST split | + B2B GSTIN, e-invoice IRN, e-way bill | Good (B2C) |
| Finance | Ledger, P&L, cash flow, GST, vouchers, payroll | (ERP level) | **Strong** |
| Procurement | POs, quotes, supplier portal, payment plans, returns | Multi-line POs, RFQ comparison, GRN partials, scorecards | Good, narrow |
| Inventory | Barcoded units, FIFO, QC counts, L2 approval | Warehouses, transfers, reorder points, cycle counts, valuation | Fair |
| Manufacturing | Items consumed per product unit | BOM, work orders, WIP, QC checklists | **Missing** |
| Admin dashboard | Finance overview only | Sales/ops KPIs, top products, low stock | Weak |
| Admin tooling | Per-page search, role editor, timelines | Global search, bulk edit, CSV import/export, audit log, saved views | Weak |
| Security | Strong headers, upload checks, CSP, BCrypt, password policy | + admin 2FA, login lockout, refresh tokens, session list | Fair |
| Observability | Custom call counters | Metrics, tracing, error tracking, alerting | **Missing** |
| Testing | ~1,700 FE + ~560 BE tests, quality gates | (same, plus CI and payment-sandbox e2e) | Good |
| SEO / analytics | None | GA4, consent, sitemap, OG tags, structured data | **Missing** |

---

## 3. Defects and risks to fix first (P0)

**Phase A status (2026-11-09): done**, except where the table below says otherwise. Each fix has tests, and the full
suites of all four services pass.

| # | Status |
|---|---|
| 1, 2 | Done. Stock and PO approvals refuse the maker (creator or last editor): `STOCK_APPROVAL_SELF_DECISION`, `ORDER_APPROVAL_SELF_DECISION`. |
| 3 | Done. 5 wrong passwords in 15 min lock the typed username for 15 min (Redis, all instances share it); `LOGIN_SUCCESS` / `LOGIN_FAILED` / `LOGIN_BLOCKED` in `auth_audit_events`. |
| 4, 5, 6 | Done. API docs off in prod (`TINQA_API_DOCS_ENABLED`); 25 MB uploads in every profile; `REDIS_HOST` required in UAT/prod; Hikari sized. |
| 7 | Done, and it also fixed stale admin permissions on Ecommerce pages. Ecommerce asks Procurement (`POST /v1/internal/auth/token-status`, cached 60 s) whether an admin token still stands and uses the admin's current permissions. `TINQA_INTERNAL_API_KEY` is now required in Ecommerce UAT/prod. Asymmetric signing (so Ecommerce cannot mint admin tokens) is still open. |
| 8 | Done. The Razorpay order is created before the placing transaction (no locks, no connection held); "Razorpay down means no order" is kept. |
| 9 | Done. `Idempotency-Key` header (V14, unique per customer), sent by the storefront, allowed by CORS. |
| 10 | Done. The draw never returns a taken number. |
| 11 | Done. Deletion anonymises the account and its saved addresses (orders and invoices kept); `GET /api/auth/profile/data-export` plus "Download My Data" on the storefront. Accounts deleted before this change are still only flagged: decide whether to anonymise them with a one-off migration. |
| 12 | Done. Duplicates removed; `* 2` / `* 2.*` ignored in all four repos. |
| 13 | Was not a real risk: `vite.config.ts` already refuses a UAT/prod build whose URL is not https or is localhost. Comment corrected. |
| 14 | Done. `.github/workflows/ci.yml` in each repo runs the same gate as the local build. Not yet run on GitHub. |

These are mostly small changes that remove real risk.

| # | Service | Issue | Why it matters | Fix |
|---|---|---|---|---|
| 1 | Procurement BE | **Stock approval has no self-approval check.** `StockServiceImpl.processAdminL2Approval` checks only the permission. ✔ verified | One person can enter stock and approve it, and approval books purchases and reconciles supplier payments. This breaks the maker-checker rule. | Reject the approval when the approver created the entry, as `SupplierPaymentService` already does. |
| 2 | Procurement BE | **PO approval has no self-approval check** (`OrderServiceImpl` ~186–207). | Same as #1, for spending money. | Same check. |
| 3 | Procurement BE | **Admin login has no lockout and no rate limit** (`AuthenticationServiceImpl.authenticate`). Logins and failed logins are not audited. | Admin passwords can be brute-forced, and there is no trace of the attempts. | Add a failed-attempt counter in Redis, a temporary lock, and `LOGIN_SUCCESS`/`LOGIN_FAILED` audit events. |
| 4 | Procurement BE | **Swagger UI and `/v3/api-docs` are public in prod** (`SecurityPaths.java:23-25`). ✔ verified | They publish the full map of the admin API. | Turn springdoc off in the prod profile, or require auth for it. |
| 5 | Procurement BE | **Prod sets no multipart limit.** Only `application-dev.yml` sets it, so prod uses Spring's 1 MB default while the validator allows 25 MB. ✔ verified | Uploads over 1 MB (invoices, documents, résumés) fail in prod, unless the deployment sets `SPRING_SERVLET_MULTIPART_*`. | Set `max-file-size: 25MB` and `max-request-size` in `application.yml`. |
| 6 | Procurement BE | The prod profile has no Redis host and no Hikari pool size. | Redis falls back to localhost, and rule 15 is broken. | Configure both explicitly. |
| 7 | Ecommerce BE | **Admin tokens cannot be revoked**: `CustomerSessionGuard` skips the session-version check for them. Either service can mint admin tokens with the shared HMAC secret. | A leaked admin token stays valid for 24 hours, and fired staff keep access until it expires. | Check the Procurement jti denylist or `passwordChangedAt` (cache it), or have Ecommerce verify admin tokens with an asymmetric public key (RS256/EdDSA). |
| 8 | Ecommerce BE | **The Razorpay HTTP call runs while product rows are locked** (`OrderPlacementService` → `preparePaymentForNewOrder`, inside the placement transaction). ✔ verified | A slow Razorpay response blocks every checkout of those products. It also breaks rule 10. | Commit the order and stock first, then create the Razorpay order in a second step (or after commit). |
| 9 | Ecommerce BE | **No idempotency key on order placement.** A double-click or retry can create two orders when items are sent explicitly. | Duplicate charges and support load. | Accept an `Idempotency-Key` header (unique per user) and return the first order on a repeat. |
| 10 | Ecommerce BE | **Order number loop**: on the 5th attempt it returns the number even if it clashes (`newOrderNumber`). A race between the exists check and the insert ends as a 500. ✔ verified | Rare, but the customer sees an error. | Use a DB sequence, or catch the unique-violation error and retry. |
| 11 | Ecommerce BE | **Account delete only sets flags.** Name, phone and addresses are kept, and customers cannot export their data. | Required under India's DPDP Act. | Anonymise personal data on delete. Keep what tax law requires: invoice details for 8 years. Add a "download my data" option. |
| 12 | Ecommerce BE | `db/migration 2/` and 40 more Finder "copy 2" folders are committed. | A duplicate migration folder can lead to confusion or a wrong Flyway location later. | Delete them and add `* 2*` to `.gitignore`. |
| 13 | Storefront | `.env.prod` points `VITE_ECOMMERCE_API_BASE_URL` at localhost and still has a TODO. | (Not a real risk: the build already refuses it.) | Comment corrected. |
| 14 | All | No CI pipeline config in any repo (`.github/` etc.). The strong quality gates exist but only run when someone runs them. | Regressions get merged. | Add a CI workflow per repo that runs the existing `scripts/test-all.mjs` and quality gates on every PR. |

**P1 hardening (next):**

- Add `@Version` (optimistic locking) to Order, Stock, Item, Supplier, Employee and Product in Procurement. Today two
  admins editing the same record silently overwrite each other.
- Add `@Valid` everywhere a body is accepted. Ecommerce `AdminCareerController` has 14 bodies and none use `@Valid`;
  Support, Refund and CompanyProfile are similar.
- Stop `GlobalExceptionHandler` returning raw `IllegalArgumentException` messages.
- Fix the HS256/HS384 mismatch in the Ecommerce JWT error message.
- Use refresh tokens with short-lived access tokens (15 min). Move the admin Web UI token from localStorage to an
  httpOnly cookie; the storefront already supports this.
- Add an outbox (or a reliable retry) for the demo-stock saga between services, so a failed `reverse()` cannot leave
  the two services disagreeing.
- Add ShedLock or Postgres advisory locks to the scheduled jobs, and move the rate limiter to Redis, before running
  more than one instance.

---

## 4. Missing features: customer side (storefront + Ecommerce BE)

**Done 2026-11-09 (owner's own design, replaces the "courier integration" and "self-serve returns" rows below):**

- **Own delivery tracking.** A `TQD-<order id>` tracking ID is given when an order ships and emailed with
  `/delivery/tracking/<id>`. Staff and riders add hub checkpoints ("Reached Lucknow", "Left Lucknow"; city and PIN
  optional). The storefront has a lookup page and an animated tracking page; sign-in is required, own orders only.
- **Admin-enabled returns.** Orders are not returnable by default. Refund staff enable a return with a charge and its
  reason, and the customer starts it within 7 days. The customer chooses to have the charge deducted from the refund
  or to pay it now (Razorpay; booked as "Return charges collected"). A return gets a `TQR-` tracking ID.
  Inspection outcomes:
  - **Pass:** full refund, less the charge if deducted.
  - **Partial:** a lower refund, with a reason.
  - **Fail:** no refund; the product is delivered back.

  Refunds go through the existing Level 2 approval.

| Feature | Criticality | Notes / benchmark |
|---|---|---|
| **Product detail pages with their own URL** (`/p/:slug`) | **P1** | Today a product is only a modal. Without a URL there is no sharing, no SEO, no ads landing page and no WhatsApp link. This is a prerequisite for most marketing. |
| **SEO basics** | **P1** | Pre-render or SSR the PDP and category pages, add per-page title/description, Open Graph tags, JSON-LD `Product`/`Offer`/`AggregateRating`, `sitemap.xml` and `robots.txt`. |
| **Search with autocomplete, filters and sort** | **P1** | Use Postgres full-text search plus `pg_trgm` (already planned for admin search). Facets: category, price, rating, in stock. A small catalogue can start with client-side filtering. |
| **Courier integration** (Shiprocket, Delhivery or similar) | **P1** | Create AWBs, print labels, book pickups, receive tracking webhooks into the existing status timeline, and handle RTO (return to origin). The tracking DTO has only a free-text partner field today. |
| **Pincode serviceability + delivery date on the PDP** | **P1** | "Delivery by Thu, 14 Nov" is standard on Amazon and Flipkart. It usually comes from the courier API. |
| **Cash on delivery** (optionally with a ₹ prepaid token, or limited to some pincodes) | **P1** | The code rejects COD on purpose. A large share of Indian buyers still choose it. A common pattern is COD with OTP confirmation plus a prepaid discount to steer buyers to UPI. |
| **Self-serve return / replacement start flow** | **P1 (quick win)** | The backend has `POST /orders/{n}/return`. The storefront only shows the return lifecycle and never calls it. Add reason, photos and pickup slot. ✔ verified |
| **Warranty registration and claims, linked to unit serials** | **P1** (what an Apple-like brand is known for) | Attach the unit barcode or serial to the order item at dispatch. Then add "My devices" in the profile with coverage dates, a "check coverage by serial" page, warranty claim and repair tickets (the empty Procurement `repair/` and `claim/` packages can hold them), and later paid extended warranty. |
| **SMS / WhatsApp notifications** | **P1** | Order placed, shipped, out for delivery, delivered, and COD confirmation. WhatsApp Business API through a provider (Gupshup, Interakt, MSG91). Reuse the email outbox design. |
| **Product variants** (colour, storage, edition) | P2 | Group products into a family with option axes and one PDP. Needed when the range grows. |
| **Wishlist / save for later** | P2 | Cheap, and it feeds back-in-stock and price-drop alerts. |
| **Back-in-stock / pre-order notify me** | P2 | Pairs with the existing pre-order logic. |
| **Abandoned cart reminders** (email/WhatsApp) | P2 | The cart is already stored on the server, so this is mostly a scheduled job and a template. |
| **Guest checkout** (verify email or phone at the end) | P2 | Reduces drop-off. Apple and Flipkart let you browse and fill the bag without an account. |
| **Phone OTP login** | P2 | Indian users expect it. Can replace the email code for phone-first users. |
| **B2B invoice with the buyer's GSTIN** | P2 | Business buyers need it to claim input tax credit. Add a GSTIN field on the address and print it on the invoice. |
| **EMI / no-cost EMI shown on the PDP** | P2 | Razorpay supports it; show "From ₹X/month". |
| **Product comparison** (2–3 products side by side) | P2 | Apple's "Compare" page. Needs structured specs (already present). |
| **FAQ / help centre** (searchable) | P2 | Cuts tickets. The assistant knowledge can be reused. |
| **Review photos, helpful votes, brand replies, product Q&A** | P2 | Standard on Amazon. |
| **Analytics (GA4) and a cookie consent banner** | P2 | Needed for funnel numbers (conversion, drop-off) and for marketing ads. |
| **Recently viewed, and "you may also like"** | P3 | Start rule-based (same category, bought together), not ML. |
| **Gift cards / store credit / refund to wallet** | P3 | Speeds up refunds and helps retention. |
| **Loyalty / referral program** | P3 | |
| **Trade-in / exchange of an old device** | P3 | Apple and OnePlus do this. Needs a grading workflow. |
| **Engraving / personalisation, gift wrap and message** | P3 | |
| **PWA (installable, offline shell), push notifications** | P3 | |
| **Multi-language** (Hindi first) | P3 | |
| **e-invoice (IRN) and e-way bill** | P3 now, **P1 once required** | IRN becomes mandatory when annual turnover passes the e-invoicing threshold. E-way bills are needed for consignments above ₹50,000. The GST engine is ready for both. |

---

## 5. Missing features: admin and operations side (Web UI + Procurement BE)

| Feature | Criticality | Notes / benchmark |
|---|---|---|
| **Sales and operations dashboard** | **P1** | Today's orders and revenue, AOV, conversion (needs analytics), top products, return rate, low stock, pending dispatch, ageing approvals. Shopify's home screen. `/analytics` is a placeholder. |
| **CSV/Excel export** of orders, customers, stock, products and suppliers | **P1** | Only finance can export today. Staff ask for this on day one. |
| **Low-stock alerts and reorder points** per item/product | **P1** | Nothing exists. Add a threshold field, a daily check, a notification, and a "suggest PO" action. |
| **Courier and shipping console** | **P1** | Pairs with the courier integration: label print, manifest, pickup list, NDR/RTO handling. |
| **Admin 2FA** (TOTP authenticator app) and session management | **P1** | Required for an admin that moves money. Add a session list, "sign out everywhere" and a new-login email alert. |
| **Audit log viewer** | **P1** | The `AUDIT_LOG_VIEW` permission exists but has no UI and no generic store. Add one `audit_event` table (who, what, entity, before/after JSON) written from services, or use Hibernate Envers. |
| **Warranty / RMA / repair desk** | **P1** | The admin half of the customer warranty feature: claim intake, diagnosis, repair or replace, parts used, a link to supplier returns. |
| **Multi-line purchase orders** (several items per PO) and **partial receipts** (several GRNs per PO) | P2 | Today it is one item, one supplier and one stock entry per PO. That is fine at the start, but real buying soon needs more. |
| **Bill of materials and work orders** | P2 | `manufacturing/` is empty. Define the item recipe per product model. A work order then consumes components and produces barcoded units. Today this happens implicitly. |
| **Warehouses / locations and transfers** | P2 | Needed once there is more than one store, a warehouse, or a demo stock location. Demo hand-outs already show the need. |
| **Cycle counts / stock audit** | P2 | Count, compare, approve the difference through maker-checker. |
| **Inventory valuation report** (FIFO is already used for consumption) | P2 | Month-end stock value, plus the cost of goods sold match with finance. |
| **Supplier scorecard** (on-time %, defect %, price variance) | P2 | All the data already exists in POs, QC and returns. |
| **RFQ comparison** (ask several suppliers, compare, award) | P2 | |
| **Global search / command palette** (Ctrl+K: order no., customer, barcode, supplier) | P2 | A barcode lookup already exists; extend it. |
| **Bulk actions and CSV import** (products, prices, stock, items) | P2 | |
| **Settings module**: tax, shipping, payment and notification config | P2 | `/settings` is a placeholder. Some settings sit in the company profile today. |
| **Customer 360 extras**: lifetime value, tags, internal notes, segments | P2 | |
| **Leave and attendance** (it feeds payroll) | P3 | Unpaid leave can only be entered as a payroll deduction line today. |
| **Saved filters / views, keyboard shortcuts** | P3 | |
| **Real-time badges** (SSE), within rule 30 | P3 | |
| **Demand forecasting** | P3 | Start with a moving average of sales per product. |
| **Asset register** (demo units, tools, equipment) | P3 | |
| Remove or finish the placeholders: `/auctions`, `/complaints`, `/documents`, `/settings`, and the empty BE packages | P3 | Each should either become a planned item or be deleted. |

---

## 6. Improving what already exists

**Storefront**

- **Home page.** Today it is a video plus one section per product. Add merchandising rails (new, best-sellers,
  offers, categories), trust badges (warranty, free shipping, easy returns, secure payment) and testimonials.
- **Product modal → page.** Keep the modal for quick view, and add the full page (section 4).
- **Pricing has two sources of truth**: `services/pricing.ts` in the browser and the server's promo quote. Show
  only server prices on checkout, so the customer is never surprised.
- **Images.** Serve WebP/AVIF with `srcset`. Shrink the logo PNGs (254 KB and 75 KB) and the 247 KB JPEG. Add a
  skeleton for the product grid.
- **Speed.** The initial JS is about 394 KB plus 134 KB CSS, and framer-motion and YouTube load up front. Lazy-load
  the YouTube player behind a poster image, defer framer-motion, and tighten `bundle.maxInitialKbGzip` (245 KB is
  generous for Indian mobile networks). Reserve space for the promo banner and payment alert to avoid layout shift.
- **The 3D store and Aura assistant** are real differentiators that Amazon and Flipkart don't have. Keep them lazy and
  make sure the core buying flow never depends on them.
- **Sign-in with expiry.** A token past its expiry forces a logout today. Refresh tokens fix this (section 3).

**Admin Web UI**

- **Shared components.** `ProductPicker` exists 3 times, `HeaderColumnFilter` twice, and there are 5+ dialog shells,
  each with its own Esc handler. There is no shared DataTable. A shared `Dialog` (with a focus trap) and `DataTable`
  (sort, filter, column picker, CSV export) would remove a lot of code and fix accessibility in one place.
- **Create and Edit Product** are two parallel modals of about 900 lines each. Merge them into one `ProductForm` with
  a mode.
- **Forms.** Validators are hand-written (`utils/validator.ts` uses `any`). react-hook-form with zod would give one
  schema per form, shared types, and fewer validation bugs.
- **Error boundaries per route**, so a crash in one module doesn't blank the whole app.
- **Data fetching.** The `useGatedLoad`/`searchResultCache` stack is a home-grown React Query. It works and follows
  the rules. Moving to TanStack Query later would bring retry, dedupe and stale-while-revalidate for free, with the
  `enabled` gating kept. P3; don't rush it.
- **Two global stores** (Redux and Zustand). Choose one for new code.

**Backends**

- **Large classes.** `SupplierPaymentService` is 1,578 lines and `ClientDemoService` 863. Split them by use case:
  plan, request, approve, pay, confirm.
- **Soft delete is inconsistent** (`is_active`, status `DELETED`, document flags). Use one convention, with
  `@SQLRestriction`, so no query forgets the filter.
- **Ecommerce logging is thin** (46 log statements). Log every state transition of orders, payments and refunds with
  the order number.
- **Payment reconciliation.** Add a daily job that compares Razorpay payments and settlements with orders. It catches
  missed webhooks before a customer complains. The expiry job only checks the local database today.
- **Documents are stored on local disk.** Move them to S3-compatible object storage before running more than one
  instance or redeploying containers.
- **Backups.** Automate daily `pg_dump`, plus a tested restore, off-host. Add `backups/` to `.dockerignore`.

---

## 7. Fewer bugs and defects

1. **CI on every PR.** This is the biggest single lever: section 3 #14.
2. **Turn on TypeScript `strict`** in the storefront (it is off) and set it explicitly in the Web UI. Fix the null
   errors it reports; most are real bugs.
3. **Tests where the risk is highest:**
   - Procurement `StockServiceImpl` and `ItemStockMovementServiceImpl` have almost no direct tests.
   - `EmployeeServiceImpl` has none.
   - There are no concurrency tests for stock approval.
   - There is no e2e test for checkout → pay → cancel/return → review. Use Razorpay test mode or a contract stub.
   - Add tests for a webhook arriving at the same time as the expiry job.
4. **Contract tests between services.** Procurement ↔ Ecommerce talk over internal APIs. A shared OpenAPI spec or a
   consumer-driven contract test stops one side breaking the other.
5. **Optimistic locking (`@Version`) on edited records.** Section 3 P1.
6. **One validation style** (`@Valid` + Bean Validation on every DTO) in both backends.
7. **Error tracking** (Sentry or GlitchTip, self-hosted) in all four services. Today the error boundaries and the
   `catch` blocks in jobs only log.

---

## 8. Running smoothly in production

- **Observability.**
  - Ecommerce: add Actuator.
  - Both backends: Micrometer → Prometheus, plus OpenTelemetry tracing. Put a request id in MDC and pass it in the
    calls between services.
  - Health checks: a real `/actuator/health` instead of `nc -z`.
  - Alerts: failed jobs, email outbox backlog, payment webhook failures, 5xx rate.
- **Resilience between services.** Add timeouts (done), a circuit breaker (Resilience4j), and an outbox for every
  cross-service write.
- **Scaling readiness.** Before running two instances:
  - scheduler locks;
  - the rate limiter in Redis;
  - files in object storage;
  - sessions already stateless (JWT).
- **CDN** for storefront assets and product images, with long cache headers (hashed assets are already immutable).
- **Optimization roadmap.** Phases 1b–11 already cover call counts, indexes, caching and pagination. Phases 3, 8 and
  10 matter most for storefront speed.

---

## 9. Suggested order of work

| Phase | Theme | Items |
|---|---|---|
| **A: Safe to launch** (1–2 weeks, mostly small) | Section 3 P0 list | Self-approval checks, login lockout + audit, Swagger off in prod, prod config, admin token revocation, Razorpay call outside the lock, idempotency key, order-number fix, cleanup of duplicate files, prod env URL, CI pipelines |
| **B: Customers can find and trust you** | Discovery + after-sales | PDP URLs + SEO + sitemap, search/filter/sort, self-serve returns (quick win), serial on order item → "My devices" + warranty check |
| **C: Delivery like Flipkart** | Logistics | Courier aggregator, AWB + tracking webhooks, pincode ETA, COD with OTP, SMS/WhatsApp notifications |
| **D: Admin productivity** | Ops | Sales dashboard, CSV export everywhere, low-stock alerts, audit log, admin 2FA + sessions, warranty/RMA desk |
| **E: Grow** | Conversion | Wishlist, back-in-stock, abandoned cart, guest checkout, phone OTP, variants, compare, GA4 + consent, B2B GSTIN |
| **F: Scale the factory** | ERP depth | Multi-line POs + partial GRN, BOM + work orders, warehouses, cycle counts, valuation, supplier scorecard, RFQ |
| **Ongoing** | Quality | Optimization roadmap phases, TS strict, shared Dialog/DataTable, observability, DPDP export/erase |
