import type { Designation } from '../../../config/access';

/**
 * The user guide: what every role does and how work moves between them. The User Guide page and its PDF downloads
 * both read only this file.
 *
 * KEEP IT IN STEP WITH THE APP. Any change to a workflow, a status, a menu item, an approval or who holds a permission
 * (Procurement DesignationAccess) must update the matching role, flow and GUIDE_CHANGELOG entry here in the same change.
 * guideContent.test.ts fails when a designation, menu item or actor is missing.
 */

/** Everyone the guide can be written for: the ten designations, plus dealers signed in to their portal. */
export type GuideRoleId = Designation | 'DEALER';

/** People and systems that take part in a flow without being a role of this app. */
export type GuideExternalActor = 'CUSTOMER' | 'SYSTEM';

export type GuideActor = GuideRoleId | GuideExternalActor;

export interface RoleGuide {
  id: GuideRoleId;
  name: string;
  /** One sentence: what the job is. */
  summary: string;
  /** Sidebar items (APP_NAVIGATION ids) this role sees, in sidebar order. My Profile is always there too. */
  menu: string[];
  /** Menu items that appear only at Level 2 (the approval queues). */
  levelTwoMenu?: string[];
  /** Whether Level 2 adds approval powers. When false the role always works at Level 1. */
  hasApprovalLevel: boolean;
  /** What the role does day to day (both levels). */
  does: string[];
  /** What a Level 2 holder of this role approves or decides. Empty when the role has no approvals. */
  approves: string[];
  /** Short practical notes. */
  tips: string[];
}

export type StepKind = 'maker' | 'checker' | 'external' | 'end';

export interface FlowStep {
  /** Who can do this step. A role is "in" a flow when it appears here. */
  who: GuideActor[];
  /** How the actor is shown on the step, e.g. "Dealer Manager · Level 2". */
  label: string;
  kind: StepKind;
  /** What happens, in plain words. */
  text: string;
  /** Where in the app, e.g. "Approvals Hub › Dealers". */
  where?: string;
  /** What happens otherwise (reject, failure). */
  otherwise?: string;
}

export interface GuideFlow {
  id: string;
  title: string;
  summary: string;
  steps: FlowStep[];
}

export interface GuideChange {
  /** YYYY-MM-DD */
  date: string;
  changes: string[];
}

/** Bump with every guide update; printed on the page and on every PDF. */
export const GUIDE_VERSION = '2.28';
export const GUIDE_UPDATED = '2026-10-29';

export const GUIDE_CHANGELOG: GuideChange[] = [
  {
    date: '2026-10-29',
    changes: [
      'Client demos › Quotation: one event can now start at the very minute the one before it ends. If Travel 1 arrives at 4:00 pm, Travel 2 can depart at 4:00 pm (not 4:01 pm); the same holds for a visit, journey or stay that starts when another ends. Only times before that are greyed out.',
      'Client demos: every time (a visit\'s From and To, a journey\'s departure and arrival, a night\'s check-in and check-out, also when adding a bill on the demo) is now picked on a round clock: choose am or pm and the hour, then the exact minute (e.g. 9:47 am).',
      'Client demos: the same time can\'t be used twice. Time already taken that day by a client visit or a journey is shaded grey on the clock, listed under it, and can\'t be picked for another visit or journey; an end time that would run into it can\'t be picked either. A night stay can\'t overlap another night stay, but the staff may visit clients and travel during a stay. A plan saved earlier with clashing times shows which item it clashes with.',
      'Client demos › Visit & staff: every product unit taken to a demo is now picked by its barcode, for accountability. Scan or type a unit\'s barcode (its product is added with it), or choose a product and tick its units in stock; the number of units is the number of barcodes. A unit another demo has on overlapping days can\'t be picked. Products listed before this keep their number of units until their units are picked.',
      'Client demos › the demo › Units taken: on the demo\'s days the attending staff (or the demo manager) scan the units as they leave and press Hand out: they are out of stock, and the storefront\'s stock goes down at once, so they can\'t be sold meanwhile (units already ordered online can\'t go). After the demo, scan them back and press Hand back: they are in stock again. A demo can\'t be sent for completion or cancelled while a unit is out; a unit that did not come back is written off by a Super Admin (Level 2) with the reason.',
      'Resubmitting a rejected product no longer asks for every barcode again: the unit and piece barcodes sent last time (when it was created, its stock changed or it was last resubmitted) are filled in. Check them, change only those that differ and scan any still missing, such as pieces of a component added after the rejection. They are kept in the browser they were entered in; on another computer they are scanned again.',
      'Creating a quotation (Orders Management › Create Order, and New quotation in the dealer portal): after choosing the item, its existing price (MRP) is shown and can\'t be edited. To quote a different price, enter it as the new quoted price; the form shows the difference (e.g. ₹1,499 → ₹1,699 is +₹200) and then needs the reason for it, which the approver sees in the Approvals Hub. Leave the new price empty to quote the existing price; the reason box stays locked until a new price is entered.',
      'Client demos › Clients: every client now has its own phone (required) and email (optional), such as a hotel\'s front desk, besides its contact person\'s. The same contact person may help at several clients.',
      'Client demos › Clients: where the client is now sits with its name, phone and email (address, PIN code, city, state and Google Maps location), with the contact person below. The PIN code is required and fills in the city and state; they are typed in by hand only when the PIN code service can\'t be reached. Changing the PIN code replaces them.',
      'The same client can\'t be visited twice in a row on one day. Clients are matched by their own phone (however it is written: +91…, 0… or the 10 digits) or email. To see a hotel from 10:00 am to 12:00 pm and again from 1:00 pm to 3:00 pm, make it one visit from 10:00 am to 3:00 pm, or visit another client in between.',
      'Client demos › Clients: Add client now starts the new client when the day\'s last visit ends (if Client 1 is 10:00 am to 1:00 pm, Client 2 starts at 1:00 pm, for three hours). If that day has no time left, it starts at 10:00 am the next day. Change the times as needed.',
      'Client demos: a journey\'s departure and arrival, and a night\'s check-in and check-out, are now one range field (in the quotation and when adding a bill on the demo). It shows both ends and how long it lasts (e.g. Fri, 10 May · 6:00 pm → Sat, 11 May · 6:00 am, 12 h). Click it to pick the start\'s day from the row of days and its time on the clock; it then moves to the end, whose day follows the start\'s (pick +1 day to arrive or check out the next day). Time already taken stays greyed out.',
      'Quotation › Day by day: journeys, the night stay and meals can be put in any order on their day. Drag a card by its handle (⋮⋮ next to its name), or focus the handle and press ↑ ↓, e.g. to make Travel 2 into Travel 1. Journeys run in the order shown, each departing when the one above arrives or later; if moving one breaks that, Next says which to fix.',
      'The clock\'s minute face now shows only 00, 05 … 55. For an exact minute, point anywhere around the face: the hand follows the pointer and the minute it will pick (e.g. 9:47 am, or "taken") shows in the middle; click to pick it.',
      'Quotation › Day by day: each day now has Travel, and you can add as many journeys as needed (e.g. Delhi → Manali, then Manali → Mall Road), each with how, from, to, its departure and arrival date and time, and its expected amount. A journey can arrive the next day (6:00 pm on 30 Oct to 6:00 am on 31 Oct).',
      'Quotation › Day by day: adding another journey keeps the journeys already filled in, in the order they were added. Journeys run one after another: each departs when the one before arrives or later (if Travel 1 arrives at 12:00 pm, Travel 2 departs at 12:00 pm or later), and a journey after an overnight one starts on the date it arrived.',
      'Times in client demos are now picked, never typed: a client visit\'s From and To, and a journey\'s or night stay\'s departure / check-in and arrival / check-out. Times that would go backwards (an arrival before its departure, a visit ending before it starts, a journey before the last one arrives) are greyed out. Moving a start past its end clears the end time, to pick again.',
      'A night stay\'s check-in and check-out now each have a date as well as a time, as check-out is usually the next day. Bills added on the demo page take the same dates.',
      'Quotation › Proposed budget: the day-by-day total is worked out from the travel, stays and meals. Add an optional extra budget on top; any extra needs the reason and its breakup (e.g. snow chains ₹1,200, local guide ₹800). The total proposed budget is the two together, and the approver sees the extra and why.',
    ],
  },
  {
    date: '2026-10-28',
    changes: [
      'Client demos visit several clients on one trip: add as many clients as needed (e.g. three hotels over two days), each with its own day and expected time, such as 10:00 am to 1:00 pm. Visits on the same day can\'t overlap. Hotels, home stays, corporate offices, hospitals, clinics and restaurants can also carry their legal name and GSTIN (optional). The trip\'s start date and number of days are now on the first step.',
      'Visit & staff: choose the products to demo, one or more, with how many units of each are taken.',
      'The quotation is planned day by day: Day 1, Day 2 … each with an optional night stay, breakfast, lunch, snacks and dinner and their expected amounts. A night\'s hotel is picked from the trip\'s hotel clients (its address, location, GSTIN and phone are filled in), or copied from another night, or typed in as another hotel; the check-in and check-out times are given too (e.g. 9:00 pm to 6:00 am). An invoice can be attached now but isn\'t needed: the travelling staff add invoices on the demo later. Changing the demo opens the same day-by-day quotation again, saved in one go.',
      'The Approvals Hub opens faster: the number on each tab is now counted by the server in one go, and a tab loads its list only when you open it (opening a tab always shows its latest list). The numbers refresh whenever you switch tabs or make a decision.',
      'Client Demos & Meetings (new menu, Super Admins and Finance Managers): schedule a demo appointment or a promotion at a client (hotel, home stay, corporate office, hospital, clinic, home visit, shopping mall, restaurant, public place or other) step by step: the client with contact details and Google Maps location, the date, time, number of days and attending staff, then the quotation (proposed budget and an optional schedule of stay: which hotel each day, its address, location and GSTIN).',
      'The quotation is approved by a different Level 2 approver before the visit (Approvals Hub › Client demos). Once approved, every change to the plan needs a reason, and a new budget or number of days sends the quotation back for approval.',
      'While the visit runs, record each day\'s stay (hotel, location, GSTIN, invoice), food (breakfast, lunch, snacks or dinner, restaurant, invoice), travel (from, to, how, ticket) and any other cost with the reason it was needed, each with its invoice or ticket as a PDF or photo. The demo works out the total against the budget. Changing or removing a recorded bill needs a reason; everything is kept on the demo\'s timeline.',
      'After the visit, send it for completion with the outcome. A different Level 2 approves it, and only then is the total spent booked in Accounts & Finance as Travel & conveyance.',
      'A completed demo is changed only by a Super Admin (Level 2): "Reopen for correction" with a reason, correct it, and send it for approval again. When approved, only the difference to what was booked is booked.',
      'My Demos (new menu, every employee): the demos you are tagged on as attending staff. Record your own hotel, food and travel bills on an approved demo while it runs.',
    ],
  },
  {
    date: '2026-10-28',
    changes: [
      'Correct barcode / Assign barcodes are now offered only to Store Managers, Fulfillment Specialists and Super Admins. Everyone else can still trace barcodes but no longer sees these options. Every correction still waits for a Level 2 Super Admin\'s approval in Approvals Hub › Barcodes.',
      'Product drafts: a product takes a lot of details, so the product form now has "Save as draft". A draft needs only a title and a category; everything else can be added later. A draft holds no stock, takes nothing from item stock and is not sent for approval. It is marked Draft in Products Management: open it (pencil-and-page icon) to carry on, add or change its components freely, save it again, or "Submit for approval" — which checks every field and asks for the first unit\'s barcodes, as a new product does.',
      'Unsold products: a switched-off product with 1 unit in stock can now have its components changed. The same save rebuilds the unit (its old pieces go back to item stock; scan the rebuilt unit\'s barcode and its pieces). A rejected product already returned its pieces, so its components change freely and the unit is scanned again on resubmission. A product on sale must be switched off first; with more than 1 unit, reduce the stock to 1 first.',
      'Sold products keep their components: once a product is on any customer order, its components can\'t change any more (past orders, warranties and costs depend on them), whether it is on or off. The form says so and offers "Create Version 2": a draft copy of the product with its components, warranties, specifications and costs, whose components you can change and send for approval. The old version keeps selling until the new one is approved and turned on; then the old one is turned off automatically. Products Management shows each product\'s version (v1, v2…) and marks sold products.',
      'Item SKUs are now generated automatically when an item is created, as TQ-year month day-number of the item that day, e.g. TQ-20261028-0001 for the first item created on 28 Oct 2026. Every SKU is unique, and it can\'t be typed in or changed. Items created earlier keep the SKUs they have.',
      'Approvals Hub › Requests now lists every quotation and order waiting on someone: quotations dealers send in (submit them for approval or cancel them, with a reason), orders to approve, and return requests to approve or reject. Each one opens with its details and the decisions it allows.',
    ],
  },
  {
    date: '2026-10-27',
    changes: [
      'Barcodes: every piece the company owns now carries its own barcode, and so does every unit of every product. Barcodes are 8-32 letters, digits or hyphens (EAN, UPC and Code 128 labels all fit); scan them or type them, one by one or pasted together.',
      'Receiving stock: scan one barcode for each unit that passed testing (defected units go back to the dealer and get none). A stock entry can\'t be saved until every passed unit has its barcode, and each barcode can be used only once.',
      'Creating a product, adding product stock and resubmitting a rejected product: scan each new unit\'s barcode and, for every component, the barcode of each piece fitted into it ("Pick from stock" fills in pieces in stock, oldest first). Reducing product stock names the units taken out; their pieces go back to item stock.',
      'Barcodes are locked once what they belong to is approved: a stock entry by its Level 2 approver, a product when it is approved. After that only a Super Admin (Level 2) can change one. Everyone else uses "Correct barcode" on the barcode\'s page, and a Super Admin approves or rejects it in Approvals Hub › Barcodes. Stock received before barcodes existed gets its barcodes the same way ("Assign barcodes" on the stock entry).',
      'Barcode Tracking (new menu): scan any barcode to see what it is. For a component piece: its item, batch, purchase order, dealer, delivery date, who received and approved it, and the product unit it is fitted into. For a product unit: every part inside it with where each came from. Every change to a barcode is listed in its history.',
      'Stock and product details, and the approvals of stock entries and new products, list the barcodes involved.',
      'A product\'s components can\'t change while units are in stock, because each unit\'s pieces are recorded by barcode: reduce the stock to 0 first (the pieces go back to item stock), change the components, then add stock again. Unit costs can still be edited. Product stock is now always changed with Add / Reduce stock.',
    ],
  },
  {
    date: '2026-10-23',
    changes: [
      'Product order: in Products Management, drag a product by its handle (⋮⋮) to the position it should have on the storefront, e.g. from fifth to first. The # column shows each product\'s position, the order is saved as soon as you drop it, and the arrow keys ↑ ↓ on the handle move a product one place.',
      'Choose a category first to arrange only that category: its products swap places among themselves and other categories don\'t move. With All Categories you set the order of the whole catalog. Clear the search before dragging.',
      'New products appear last until moved. Ordering is done by whoever can publish products (Super Admins, Store Managers, Catalog Specialists); it is not part of the product form and needs no approval.',
    ],
  },
  {
    date: '2026-10-23',
    changes: [
      'Product categories: every product now has a category (Dioramas, Accessories, Spare parts...). In the product form, pick one from the Category box or type a new name and choose "Create category" — it is created when the product is saved. There is no fixed list.',
      'A name that matches an existing category, ignoring capitals, spaces and punctuation ("accessories", "Accessories "), always picks that category, so the same category is never created twice.',
      'Existing products were placed in Dioramas, and accessories in Accessories. Changing a product\'s category is an edit like any other: on an approved product it goes for approval, and the approver sees the old and new category.',
      'Products Management shows each product\'s category and filters the list by category.',
      'Storefront: the Dioramas page is now Products. Its bar lists the categories with how many products each has; choosing one jumps to that category and shows all its products. A link such as /products?category=accessories opens the page at that category.',
    ],
  },
  {
    date: '2026-10-22',
    changes: [
      'Customer Management (new menu): search storefront customers by name, email or phone, or list those who left items in their cart. A customer\'s page shows their profile and addresses, every order with what they bought and when, their cart, their support tickets and an activity timeline, with email and call links to contact them.',
      'Customer details (name, phone, date of birth) are changed only by the Super Admin (Level 2), with a reason. Customer Support and Store Managers use "Request change": the Super Admin is notified with the requested values and a link to the customer, and makes the change after checking it.',
      'Product costing: the product form has a "Costing & profit" section. Each component\'s unit cost is filled from its purchase price (what the next unit taken from stock cost, including its share of freight) and can be adjusted; add every other cost of one unit — manpower, software, packaging — with how you worked it out.',
      'The form shows live what one unit earns: selling price, GST taken out, net revenue, cost, profit before tax, margin, income tax and profit after tax (PAT). The approver sees the cost and profit with the request.',
      'Product details show the cost sheet and the profit made so far on delivered orders. Customer order details show the order\'s profit: each line at its cost when ordered, shipping charged and shipping paid.',
      'Accounts & Finance › Product profit lists the profit of every product on delivered orders in a period. Costs are seen by Super Admins, Store Managers, Catalog Specialists, Financial Auditors and Finance Managers, and entered by the first three; customers never see them.',
      'Analytics is no longer listed in the role menus; it is hidden from the sidebar for now.',
      'Salaries: each month the Finance Manager records salary transfers in Payments & Chalans (one employee, or everyone unpaid at once, with bonuses or deductions); a different Level 2 confirms them. Confirmed salaries are booked in Accounts & Finance and each payslip is emailed.',
      'My Payslips: every employee sees and downloads their own payslips once the month\'s salary is confirmed.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Accessories: in the product form, tick "This product is also an accessory" and choose the products it is offered with. It still sells on its own at its own price and discount.',
      'Each of those products gets its own extra discount (0–90 %). When a customer buys the accessory together with that product, one accessory per unit of the product gets the extra percent off its already-discounted price; any more accessory units are charged the normal price.',
      'Add "Why customers need it" and up to 10 benefits. The storefront shows them with the accessory\'s warranties and what\'s included next to each product, in the bag and at checkout.',
      'A product that has accessories can\'t become an accessory itself, and an accessory can\'t have accessories. Accessory changes on an approved product go for approval like any other edit; the approver sees the products and discounts.',
      'Orders, invoices and store-sale totals show the bundle discount on the accessory line.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Company Profile is split into tabs, one per section: Brand, Legal & address, Contact, Home page video, Sign-in pages, Shipping charges and Invoice terms. Each tab shows that section as it is live, its change waiting for approval and your drafts for it.',
      'Propose a change in a tab drafts only that section, and the editor shows only its fields. Approving it puts just that section live; every other section stays as it is, including changes approved after the draft was made.',
      'One change per section can wait for approval, so a pending Brand change no longer blocks submitting, say, Shipping charges. The Approvals Hub lists each pending change with its section.',
      'GSTIN, PAN and the registered address are one section (Legal & address) because the state code must match the GSTIN.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Sign-in pages: this admin portal and the storefront now share one layout: the sign-in form on one half and, on the other, a background image covering the whole half with a headline, an optional tagline and up to 4 highlight points over it.',
      'Company Profile › Sign-in pages: upload the image (JPG, PNG or WEBP, up to 5 MB; used by both portals) and write each portal\'s own headline, tagline and points, with a preview of each. Like the logo and home page video, it goes live only after another Level 2 approves the version. Without an image the blue background is shown.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Verified emails: before a customer or an employee is registered, their email is proved with a 5-digit code sent to it. The Store Sales Agent (customer\'s email) or the Super Admin (new employee\'s personal email, now required) presses Send code, types the code the person reads out and presses Verify; registering is possible only after that. A code works for 10 minutes; a new one can be asked for after a minute.',
      'No temporary passwords: a new employee is emailed a link to choose their password at their personal email once the account is approved (or at once when no approval is needed), and a customer registered at a store gets a "Set my password" link in their welcome email. Links work once, for 15 minutes.',
      'Forgot password: staff and dealers use "Forgot password?" on the sign-in page with their username or email, customers on the storefront sign-in page with their email. A link to choose a new password is emailed (employees: to the personal email); it works once, for 15 minutes, and signs out every other session.',
      'Customers are emailed when their order is confirmed, shipped, out for delivery and delivered; the delivered email carries the GST tax invoice as a PDF.',
      'Store Sales shows the customer\'s email (verified or not), mobile, whether they have set their password yet and, on every sale, the delivery address.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Store sales: a new Store Sales Agent designation sells at a store or in the market. In Store Sales the agent finds the customer by mobile number or email, or registers them (the same details as the storefront sign-up, and a delivery address; no password), adds products, gets the total from the server and books the order. Each sale is credited to the agent who booked it.',
      'Cash the agent received counts at once: the order is marked paid and confirmed and the sale, shipping and GST are booked to the company account, naming the agent. There is no separate cash approval. Fulfilment then continues as for any order. An online store sale is paid by the customer from their account.',
      'After a store sale the customer is emailed a welcome or order email with the website link, their user ID, the order summary, how to sign in and track the order, and the payment receipt as a PDF (the GST tax invoice is still issued when the order ships). Store Sales shows whether each email was sent.',
      'Company Profile › Email (Level 2 Super Admin): the mail server, sender address and name, and reply-to address of customer emails, with a test email. The password is stored encrypted and never shown again. Emails carry the live profile\'s brand name, logo, website and support details.',
      'Customer orders show where they were sold and by whom. Customers can\'t cancel or return a cash store order online: the store or customer support does it. Store and Finance Managers and Financial Auditors see every agent\'s sales (Store Sales › All store sales).',
    ],
  },
  {
    date: '2026-10-20',
    changes: [
      'GST in one place: Accounts & Finance › GST shows the GST charged to customers (output tax), the GST paid to dealers and on bills (input tax, and how much is claimable as input tax credit), the set-off month by month, what is payable in cash with each GSTR-3B, what was paid to the government and what is outstanding till date. The GST register below it lists every invoice, credit note, dealer purchase and bill line with its order, document number, party, GSTIN and CGST/SGST/IGST/cess, and exports to CSV, PDF, Excel or Word.',
      'A refund on an invoiced customer order now issues a credit note (e.g. TQC/26-27/000001) that takes its share of the invoice\'s GST off output tax; the customer sees it on their order.',
      'Finance waits for Admin Level 2: a dealer purchase is booked only when a Level 2 approves the stock entry (not when it is recorded), with the quotation\'s GST as input tax. A change to an approved stock entry (units added or counts corrected) also waits for Level 2: the money stays at the approved value and added units are held back from use until it is approved; rejecting puts the approved counts back.',
      'GST in a customer payment is held for the government, not counted as sales; expense bills claim their GST as input tax credit unless marked as blocked credit. GST paid to the government is raised as a "GST paid to the government (challan)" voucher.',
      'Dealers sign in to this web app: Dealer Managers create their logins, a different Level 2 approves them.',
      "Dealers' quotation changes wait for a Dealer Manager of either level; the quotation is frozen meanwhile.",
      'Quotation, purchase order and bill can be printed from an order.',
      'Pre-orders are approved from the Approvals Hub (Pre-orders tab) once stock is there and the order is paid.',
      'Customer orders are confirmed only when fully paid; payment attempts show on the order.',
      'Expenses and vouchers: attach the bill to fill the form, GST is split CGST/SGST or IGST from the GSTINs.',
      'Item and product warranties; edits to an approved product wait for approval while the live one stays unchanged.',
      'Delivery riders record door-step outcomes only; Fleet Coordinators also send parcels back to the warehouse.',
      'User Guide in the sidebar for Super Admin and Store Manager, with per-role PDF downloads.',
      'Item and Dealer lists: search and every filter (category, unit, city, status) cover the whole list, with pages; employee search matches full names.',
      'Search boxes on server lists (items, dealers, employees, order tracking, ledger, vouchers) search 2 seconds after you stop typing, or at once on Enter.',
      'Product GST, as the law requires: every product has an HSN/SAC and one GST rate (0, 0.25, 1.5, 3, 5, 18 or 40%), and its price includes GST. Each order charges CGST + SGST (half the rate each) when delivered in our state and IGST to other states; delivery charges are taxed at the goods\' rate.',
      'Customer tax invoices are issued when the order ships, numbered consecutively per financial year (e.g. TQ/26-27/000001), and print the exact GST split with the place of supply.',
      'Dealers mark their confirmed orders as shipped from My Orders; the procurement team is notified and records the delivery.',
      'Fulfillment & Warehouse sees every delivered purchase order that has no stock entry yet when adding stock, without needing access to procurement orders.',
      'Dealer purchases reach the company account when stock is recorded, not on delivery: only units that passed testing are paid for (unit price × passed units + shipment). Correcting or adding passed units books the difference; a rejected stock entry books nothing.',
      'Quotations can carry an optional GST breakup: CGST + SGST (dealer in our state) or IGST (another state) at one of the rates in force, with HSN/SAC and cess. Prices are before GST; the GST follows any later change to quantity, price or shipment, and dealers change it through the usual change request.',
      "Marking a procurement order delivered needs the dealer's invoice PDF. It is read and checked against the quotation (total, taxable value, CGST/SGST/IGST, cess and the dealer's GSTIN). A matching invoice lets the order be delivered; one that doesn't match, or a scanned PDF that can't be read, needs a Level 2 order approver to accept it with a reason, which is kept in the order's history.",
    ],
  },
  {
    date: '2026-10-15',
    changes: ['Access is set by designation and level (Level 1 maker, Level 2 approver) instead of hand-picked roles.'],
  },
];

const ROLE_LIST: RoleGuide[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    summary: 'Runs the whole portal: staff accounts, access, settings and every approval.',
    menu: ['finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'customers', 'support-tickets', 'reviews',
      'employees', 'items', 'barcodes', 'products', 'dealers', 'payments', 'client-demos', 'my-demos', 'my-payslips', 'company-profile',
      'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create employees with a designation and level, edit them, and request their removal',
      'See what every designation holds (Employee Management › Roles & permissions) and change an employee\'s access',
      'Everything every other staff role can do',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
      'Set up the mail server and sender of customer emails, and send a test (Company Profile › Email, Level 2)',
      'Record monthly salary transfers (Payments & Chalans), like a Finance Manager',
      'Correct a customer\'s name, phone or date of birth (Customer Management › Edit details, Level 2), including changes customer care asked for',
      'Correct a locked barcode directly (Barcode Tracking › Correct barcode, Level 2); the change is kept in the barcode\'s history',
      'Schedule client demos and meetings and record their bills, like a Finance Manager (Client Demos & Meetings)',
      'Reopen a completed client demo for correction, with a reason (Level 2): only a Super Admin changes a completed demo, and the correction is approved again',
      'Write off a product unit that did not come back from a client demo, with the reason (Level 2): it leaves stock for good',
    ],
    approves: [
      'New employee accounts, employee deletions and profile changes',
      'Products, stock entries, procurement orders and returns, dealer logins and dealer quotation changes',
      'Refunds, expenses, company profile changes and documents',
      'Salary transfers recorded by someone else (never your own salary)',
      'Barcode corrections, and barcodes for stock received before barcodes were recorded (Approvals Hub › Barcodes): only a Level 2 Super Admin changes a locked barcode',
      'Delete anyone\'s company profile draft',
      'Client demo quotations, completions and corrections (Approvals Hub › Client demos), except demos you planned, sent or attend',
    ],
    tips: [
      'You never approve your own request: a second Super Admin (Level 2) decides on what you prepare.',
      'Access is never granted one button at a time. Change the designation or level instead.',
    ],
  },
  {
    id: 'STORE_MANAGER',
    name: 'Store Manager',
    summary: 'Owns the online store: catalog, stock, customer orders, refunds, support, reviews and the company profile.',
    menu: ['finance', 'approvals', 'store-sales', 'order-tracking', 'customers', 'support-tickets', 'reviews', 'items',
      'barcodes', 'products', 'payments', 'my-demos', 'my-payslips', 'company-profile', 'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create and edit items (with warranties) and products, submit them for approval and publish approved ones',
      'Save unfinished products as drafts, and create a new version of a sold product to change its components',
      'Set the order products appear in on the storefront by dragging them in Products Management',
      'Enter each product\'s costs (component costs, manpower, software…) and see its profit before and after tax, per unit and on delivered orders',
      'Move customer orders forward, update tracking and accept pre-orders once stock is there',
      'Book store sales for walk-in customers, like a Store Sales Agent, and follow every agent\'s sales',
      'Request refunds, reply to support tickets, publish or hide reviews',
      'Look up customers with their orders, carts and tickets, and ask the Super Admin to correct their details',
      'Trace any piece or product unit by its barcode (Barcode Tracking) and ask a Super Admin to correct a barcode',
      'Draft company profile changes, upload documents, raise expenses',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
    ],
    approves: ['Products and their changes before they go live, seeing each one\'s cost, margin and profit after tax (approving a new product locks its unit barcodes)', 'Stock entries (approving locks the barcode of each passed unit)', 'Refunds', 'Company profile changes'],
    tips: [
      'Pre-orders can be accepted at Level 1 too: Approvals Hub › Pre-orders.',
      'Dealers and procurement orders belong to the Dealer Manager; they are not in your menu.',
    ],
  },
  {
    id: 'DEALER_MANAGER',
    name: 'Dealer Manager',
    summary: 'Buys from suppliers: dealers, their web logins, quotations and procurement orders.',
    menu: ['finance', 'approvals', 'orders', 'items', 'barcodes', 'products', 'dealers', 'payments', 'my-demos', 'my-payslips'],
    hasApprovalLevel: true,
    does: [
      'Onboard, edit, activate or deactivate dealers and assign them item categories',
      'Create a dealer\'s web login, switch it off or reset its password',
      'Create quotation requests (RFQs) at the item\'s existing price, or at a new quoted price with the reason for it, edit quotations and submit them for approval',
      'Review quotations dealers send in and submit them for approval or cancel them, from Approvals Hub › Requests (Level 1 too)',
      'Move orders forward: shipped, delivered, returns and refunds',
      'Add the GST breakup to a quotation (optional): CGST + SGST or IGST, rate, HSN/SAC, cess',
      "Upload the dealer's invoice PDF when marking an order delivered; it is checked against the quotation",
      'Print the quotation, purchase order and bill of an order',
      'Approve or reject dealers\' changes to their quotations (Level 1 too)',
      'View the catalog and stock, upload documents, raise expenses',
      'Trace a piece by its barcode back to its purchase order, batch and dealer (Barcode Tracking)',
    ],
    approves: [
      'Procurement orders (approve or reject) and the dealer\'s confirmation',
      "Accepting a dealer's invoice that doesn't match the quotation, or couldn't be read, with a reason",
      'Return requests',
      'Dealer logins created by someone else',
      'Removing a dealer',
    ],
    tips: [
      'While a dealer\'s change request is open the quotation is frozen for everyone until it is decided. It shows in Approvals Hub › Dealers, and in Requests again once the change is decided.',
      'To adjust a dealer\'s quotation before submitting it, edit it in Orders Management; the Approvals Hub submits it as it is.',
      'Deactivating a dealer also switches off their login.',
      "An invoice that doesn't match is shown figure by figure: ask the dealer for a corrected invoice before accepting one by override.",
    ],
  },
  {
    id: 'CATALOG_SPECIALIST',
    name: 'Catalog Specialist',
    summary: 'Builds and maintains the product catalog.',
    menu: ['finance', 'items', 'barcodes', 'products', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Create, edit and delete items and item categories, including their warranties. Each new item gets its SKU automatically (TQ-yyyyMMdd-0001, numbered per day); it can\'t be changed',
      'Create products from items, with components and warranties, scanning the new unit\'s barcode and the barcode of every component piece fitted into it',
      'Add or reduce product stock: each added unit gets its barcode and its pieces\' barcodes; units taken out are named by barcode',
      'Give each product a category: pick an existing one or type a new name to create it',
      'Enter what one unit costs: each component\'s unit cost (filled from its purchase price) and extra costs such as manpower or software, each with how it was worked out',
      'Check what the product earns before saving: net revenue, cost, profit, margin and profit after tax; later, its profit on delivered orders (product details, Accounts & Finance › Product profit)',
      'Set each product\'s HSN/SAC and GST rate; the price you enter is what the customer pays, GST included',
      'Mark a product as an accessory of other products, with an extra discount when bought together',
      'Submit products for approval and publish approved ones to the storefront',
      'Save an unfinished product as a draft (only title and category needed) and finish it later',
      'Create a new version of a sold product to change its components',
      'Set the order products appear in on the storefront by dragging them in Products Management, for the whole catalog or one category',
      'View stock, upload documents',
    ],
    approves: [],
    tips: [
      'Editing a product that is already approved sends the change for approval; the live product stays as it is until then.',
      'To put a product first in its category, choose that category in Products Management and drag the product to the top. Without a category chosen, you move it in the whole catalog.',
      'Before creating a category, type a few letters and look at the suggestions: reuse "Accessories" rather than creating "Accessory". The storefront lists products under their category, so a clear, plural name reads best.',
      'Enter the GST-inclusive price (e.g. ₹59,999). The form shows the split for delivery in our state (CGST + SGST) and to other states (IGST); both add up to exactly that price. Orders keep the GST they were placed with even if the rate changes later.',
      'Products created before GST was recorded need their HSN/SAC and rate added the next time they are edited.',
      'Accessory extra discounts stack on the accessory\'s own discount: ₹1,000 at 10 % off is ₹900; with 5 % extra next to its product it is ₹855. Use 0 % to show it with a product without an extra discount.',
      'Costs exclude GST (GST paid on purchases comes back as input tax credit). Write the reason with each extra cost, e.g. "2 technicians × 4 hours × ₹250/hour", so the approver and finance can check it.',
      'A component left without a cost is flagged: the profit shown is then too high. Shipping is not part of the product\'s cost; it is added to each order when it ships.',
      'Changing the components of a product that has not been sold: switch it off first. With 1 unit in stock, the same save rebuilds that unit — its old pieces go back to item stock and you scan the rebuilt unit\'s barcodes. A rejected product already gave its pieces back, so its components change freely; when you resubmit, the barcodes entered last time are filled in and only the new components\' pieces are scanned. With more units, reduce the stock to 1 (or 0) first.',
      'Not sure of every detail yet? Save the product as a draft. Its components can change as often as you like until you submit it; its first unit is built (and its barcodes scanned) only when you submit.',
      'Once a product has been sold, its components are locked for good. Use "Create Version 2" (in the product form or the list): change the copy, submit it, and once it is approved and turned on the old version is switched off by itself. Orders already placed keep pointing at the version they bought.',
      'A wrong barcode can\'t be fixed once approved: tell your Store Manager or the warehouse (Fulfillment); they ask for the correction in Barcode Tracking and a Super Admin decides.',
    ],
  },
  {
    id: 'FULFILLMENT_SPECIALIST',
    name: 'Fulfillment & Warehouse',
    summary: 'Receives stock and picks, packs and ships customer orders.',
    menu: ['finance', 'approvals', 'order-tracking', 'items', 'barcodes', 'products', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Receive any delivered purchase order into stock, scanning one barcode for each unit that passed testing, correct an entry\'s quantities, set storefront stock',
      'Trace any piece by its barcode, and ask a Super Admin to correct a wrong one or to label stock received before barcodes (Assign barcodes)',
      'Confirm paid orders, then move them through processing, packed and shipped',
      'Accept pre-orders once stock is there (Approvals Hub › Pre-orders)',
      'Update shipment tracking, raise expenses (e.g. shipping costs)',
    ],
    approves: [],
    tips: [
      'Stock you record counts only after a Level 2 Store Manager approves it; that also locks its barcodes.',
      'Scan the label on each piece as you count it: the form takes a scanner\'s codes one after another, or a pasted list.',
    ],
  },
  {
    id: 'DELIVERY_RIDER',
    name: 'Delivery Rider',
    summary: 'Delivers orders to the customer\'s door.',
    menu: ['order-tracking', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'See customer orders and their shipping address',
      'Record what happened at the door: out for delivery, delivered, customer unavailable, invalid address, customer cancelled delivery, re-attempt',
    ],
    approves: [],
    tips: ['Other statuses (packing, sending a parcel back to the warehouse) belong to fulfilment staff and the Fleet Coordinator.'],
  },
  {
    id: 'FLEET_COORDINATOR',
    name: 'Fleet Coordinator',
    summary: 'The riders\' senior: plans deliveries and keeps tracking up to date.',
    menu: ['finance', 'order-tracking', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Record the same door-step outcomes as a rider',
      'Update shipment tracking and send refused or undeliverable parcels back to the warehouse',
      'Raise expenses',
    ],
    approves: [],
    tips: [],
  },
  {
    id: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    summary: 'Helps customers with tickets, orders and refunds.',
    menu: ['order-tracking', 'customers', 'support-tickets', 'items', 'barcodes', 'products', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'View, reply to and change the status of support tickets; suggested replies help you answer quickly',
      'Open a customer (Customer Management) to see everything they bought and when, what is still in their cart and their tickets, then email or call them',
      'Ask for a correction to a customer\'s details (Request change); the Super Admin makes it',
      'Look up the customer\'s order, payment and products from the ticket',
      'Request a refund and re-check its status with the payment gateway',
      'Trace a customer\'s device by its barcode: every part inside it, with its batch, purchase order and dealer (Barcode Tracking)',
    ],
    approves: [],
    tips: [
      'Suggested replies are never sent by themselves: you choose and edit before sending.',
      'Customer Management › "Items left in cart" lists customers who added products but did not order: a good list to follow up.',
    ],
  },
  {
    id: 'FINANCIAL_AUDITOR',
    name: 'Financial Auditor',
    summary: 'Checks the books. Read-only everywhere.',
    menu: ['finance', 'orders', 'store-sales', 'order-tracking', 'barcodes', 'payments', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'View the company account overview, ledger, expenses and vouchers',
      'Export finance reports as PDF, Excel or Word',
      'Check what every product earns on delivered orders (Accounts & Finance › Product profit), product cost sheets and each customer order\'s profit',
      'Check the GST position and register: output tax, input tax credit, payable in cash per month, paid and outstanding',
      'View every month\'s salary payments and download any payslip (Payments & Chalans)',
      'View refunds, customer and procurement orders, documents',
      'See every agent\'s store sales (Store Sales)',
      'Trace any piece or product unit by its barcode, with its full history (Barcode Tracking)',
    ],
    approves: [],
    tips: [],
  },
  {
    id: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    summary: 'Runs company money: expenses, vouchers, payments and reports.',
    menu: ['finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'payments', 'client-demos', 'my-demos', 'my-payslips'],
    levelTwoMenu: ['approvals'],
    hasApprovalLevel: true,
    does: [
      'View and export the company account, ledger and reports',
      'See the profit of every product and customer order, before and after income tax (Accounts & Finance › Product profit, order details)',
      'Raise expenses and vouchers',
      'Each month, record the salaries transferred from the bank (Payments & Chalans): one employee with a bonus or deduction, or everyone unpaid at once; resend a payslip email',
      'Track GST payable each month (Accounts & Finance › GST) and record GST paid to the government as a GST payment voucher',
      'View refunds, customer and procurement orders, documents',
      'See every agent\'s store sales and how they were paid (Store Sales)',
      'Schedule client demos and meetings step by step: every client visited at its own time, the products to demo (each unit taken by its barcode), the attending staff and a day-by-day quotation (travel, night stay and meals, plus any justified extra); send it for approval, record each day\'s stay, food, travel and other bills with their invoices, and send the visit for completion (Client Demos & Meetings)',
    ],
    approves: [
      'Expenses and vouchers: approve, reject or reverse (approving posts them to the ledger)',
      'Client demo quotations before the visit, and completions after it: approving a completion books its bills as Travel & conveyance (Approvals Hub › Client demos)',
      'Salary transfers recorded by someone else: confirming books them as salaries and emails each payslip',
    ],
    tips: [
      'You cannot approve a voucher you raised yourself, confirm a salary you recorded, or confirm your own salary.',
      'Confirm a salary only once the money has left the bank: it can\'t be undone. A wrong one is rejected and recorded again.',
      'You can\'t approve a client demo you planned, sent for approval or attend. A completed demo can only be corrected by a Super Admin.',
    ],
  },
  {
    id: 'SALES_AGENT',
    name: 'Store Sales Agent',
    summary: 'Sells devices at a store or in the market, for cash or online payment.',
    menu: ['store-sales', 'my-demos', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Find a walk-in customer by mobile number or email, or register them with their delivery address',
      'Add products, get the total from the server and book the order: cash you received, or online by the customer',
      'Follow your own sales and whether the customer\'s email went out (Store Sales › My sales)',
    ],
    approves: [],
    tips: [
      'Book a cash sale only once you hold the full total: it is marked paid and booked to the company account at once, credited to you.',
      'Verify the customer\'s email before registering them: press Send code and type the 5-digit code they read out from their email. Their receipt, order updates, the tax invoice and a link to set their password all go there.',
      'A customer who lost the set-password link (it works for 15 minutes) uses "Forgot password" on the website sign-in page.',
      'If the total changed since you got it, the new total is shown: agree it with the customer and book again.',
      'Customers can\'t cancel or return a cash sale online; they come back to the store or contact customer support.',
    ],
  },
  {
    id: 'DEALER',
    name: 'Dealer',
    summary: 'A supplier signed in to their own dealer portal in this web app.',
    menu: ['dealer-quotations', 'dealer-orders'],
    hasApprovalLevel: false,
    does: [
      'Create quotations for TinQa at the item\'s existing price, or at a new quoted price with the reason for it, optionally with the GST breakup (CGST + SGST or IGST, rate, HSN/SAC, cess)',
      'Request changes to a quotation while it is still a quotation',
      'Follow your orders: open quotations, ongoing orders and past orders',
      'Mark a confirmed order as shipped once the goods have left (My Orders › View)',
      'Print the quotation, purchase order and bill',
      'See your business details and change your password (My Profile)',
    ],
    approves: [],
    tips: [
      'You only ever see your own quotations and orders.',
      'Your invoice is checked against the quotation on delivery: bill the same total and GST, and show your GSTIN on it.',
      'Your business details are kept by your Dealer Manager; ask them to change anything.',
    ],
  },
];

export const ROLE_GUIDES: Record<GuideRoleId, RoleGuide> = Object.fromEntries(ROLE_LIST.map((role) => [role.id, role])) as Record<
  GuideRoleId,
  RoleGuide
>;

export const GUIDE_ROLE_IDS: GuideRoleId[] = ROLE_LIST.map((role) => role.id);

/** How actors that are not roles of this app are named. */
export const EXTERNAL_ACTOR_NAMES: Record<GuideExternalActor, string> = { CUSTOMER: 'Customer', SYSTEM: 'TinQa' };

const ANY_STAFF: GuideActor[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'DEALER_MANAGER', 'CATALOG_SPECIALIST', 'FULFILLMENT_SPECIALIST',
  'DELIVERY_RIDER', 'FLEET_COORDINATOR', 'CUSTOMER_SUPPORT', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SALES_AGENT'];

export const GUIDE_FLOWS: GuideFlow[] = [
  {
    id: 'sign-in',
    title: 'Signing in for the first time',
    summary: 'Employees choose their password through an emailed link; dealers start with the default password and change it.',
    steps: [
      { who: [...ANY_STAFF], label: 'New employee', kind: 'maker', text: 'Opens the "Set up your account" email at their personal email and chooses a password (the link works once, for 15 minutes).', where: 'Set my password (from the email)' },
      { who: ['DEALER'], label: 'Dealer', kind: 'maker', text: 'Signs in with the username and the default password they were given, then chooses their own. Nothing else opens until they do.', where: 'Login page › Reset password' },
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'end', text: 'The sidebar lists only what your designation allows. My Profile is always there.' },
    ],
  },
  {
    id: 'forgot-password',
    title: 'Forgot password',
    summary: 'A link to choose a new password is emailed; it works once, for 15 minutes.',
    steps: [
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'maker', text: 'Chooses "Forgot password?" and enters their username or email.', where: 'Login page › Forgot password?' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Emails a link (to the personal email for employees). The page never says whether an account matched.' },
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'maker', text: 'Opens the link and chooses a new password. Every other session is signed out; an expired link offers a new one.', where: 'Set password (from the email)' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Does the same on the storefront: "Forgot password?" on the sign-in page, with their email.' },
    ],
  },
  {
    id: 'employee',
    title: 'Adding an employee',
    summary: 'Two Super Admins: one creates the account, the other approves it.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Enters the employee\'s personal email, presses Send code and types the 5-digit code the employee reads out from it (Verify).', where: 'Employee Management › Create' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Creates the employee and picks a designation and Level 1 or Level 2.', where: 'Employee Management' },
      { who: ['SUPER_ADMIN'], label: 'Another Super Admin · Level 2', kind: 'checker', text: 'Approves the new account.', where: 'Approvals Hub › Requests', otherwise: 'Reject → the account cannot sign in' },
      { who: [...ANY_STAFF], label: 'New employee', kind: 'end', text: 'Gets a "Set up your account" email at their personal email, chooses a password through it and signs in to their menu.' },
    ],
  },
  {
    id: 'dealer-onboarding',
    title: 'Onboarding a dealer and their login',
    summary: 'A dealer record first, then a web login that a different Level 2 approves.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Adds the dealer with its business details and the item categories it deals in; the dealer only sees and quotes for items in those categories.', where: 'Dealer Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Creates the dealer\'s web login inside the dealer\'s details. It starts with the default password.', where: 'Dealer Management › dealer › Login' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Another Dealer Manager · Level 2', kind: 'checker', text: 'Approves the login. The person who created it cannot.', where: 'Approvals Hub › Dealers', otherwise: 'Reject → the login cannot sign in' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Signs in, sets a new password and sees My Quotations and My Orders.' },
    ],
  },
  {
    id: 'procurement',
    title: 'Buying from a dealer',
    summary: 'From quotation to goods at the warehouse. Every step moves forward only.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN', 'DEALER'], label: 'Dealer Manager or Dealer', kind: 'maker', text: 'Records a quotation: items, quantities, prices (before GST), dates and, optionally, the GST breakup.', where: 'Orders Management · My Quotations' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Submits the quotation for approval. It shows as "Under review" to the dealer. Quotations a dealer sent in wait in the Approvals Hub.', where: 'Approvals Hub › Requests · Orders Management', otherwise: 'Cancel → with a reason; the dealer is told' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the order, which then waits for the dealer.', where: 'Approvals Hub › Requests', otherwise: 'Reject → the order is cancelled' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Records that the dealer confirmed the order. The purchase order can now be printed.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN', 'DEALER'], label: 'Dealer or Dealer Manager', kind: 'maker', text: 'Marks the confirmed order as shipped once the goods have left. The procurement team is notified.', where: 'My Orders · Orders Management', otherwise: 'Cancel is possible only before shipment, with a reason' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: "Uploads the dealer's invoice PDF. TinQa reads it and checks the total, the GST and the dealer's GSTIN against the quotation.", where: 'Orders Management › Update status › Mark delivered' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: "Only when the invoice doesn't match or can't be read: accepts it with a reason, or asks the dealer for a corrected invoice.", where: 'Orders Management › Update status', otherwise: 'No override → upload a correct invoice; the order stays shipped' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Marks it delivered with the actual delivery date. The bill can now be printed.', where: 'Orders Management' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Picks the delivered order, records the units that passed testing and scans one barcode per passed unit. Nothing is booked yet; defected units go back.', where: 'Item Management › Stocks › Add stock' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the stock entry, which also locks its barcodes. Only now is the purchase booked to the company account, with its GST as input tax.', where: 'Approvals Hub › Requests', otherwise: 'Reject → stock is not added, nothing is booked and its barcodes are freed' },
      { who: ['SYSTEM'], label: 'Inventory', kind: 'end', text: 'Stock is available to sell.' },
      { who: ['SYSTEM'], label: 'Company ledger & GST register', kind: 'end', text: 'The purchase (approved passed units × unit price + shipment) and its GST are posted. A later change to the entry waits for Level 2 again; only an approved change posts the difference.', where: 'Accounts & Finance' },
    ],
  },
  {
    id: 'dealer-change',
    title: 'A dealer changes their quotation',
    summary: 'Dealers never edit directly: every change is a request any Dealer Manager (Level 1 or 2) decides.',
    steps: [
      { who: ['DEALER'], label: 'Dealer', kind: 'external', text: 'Opens the quotation and requests a change. Only possible while it is still a quotation.', where: 'My Quotations' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'The quotation is frozen for everyone (no edit, submit or cancel) until the request is decided.' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 1 or 2', kind: 'checker', text: 'Compares old and new values and approves or rejects.', where: 'Approvals Hub › Dealers', otherwise: 'Reject → the quotation stays as it was' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Sees the updated quotation, which carries on through approval.' },
    ],
  },
  {
    id: 'procurement-return',
    title: 'Returning goods to a dealer',
    summary: 'For a delivered order, some or all goods can go back for a refund.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Requests a return with a reason.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the return once the dealer agrees.', where: 'Approvals Hub › Requests', otherwise: 'Reject → with a reason; the order stays delivered and closes' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Marks it picked up, then received by the dealer.' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Records the dealer\'s refund: initiated, then completed.', otherwise: 'Refund failed → initiate it again' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Follows the return in My Orders.' },
    ],
  },
  {
    id: 'product',
    title: 'A new product on the storefront',
    summary: 'Products go live only after a Level 2 Store Manager approves them.',
    steps: [
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Creates the item, with one or more categories, attributes and warranties.', where: 'Item Management' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Optionally saves the product as a draft first (title and category are enough) and finishes it later; a draft holds no stock and is not sent for approval. To change the components of a product that has already been sold, creates a new version of it instead: a draft copy whose components can change.', where: 'Products Management › Save as draft · Create new version' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Creates the product from items (components), its category (an existing one or a new one), GST-inclusive price, GST rate and HSN/SAC, and warranties, scans the first unit\'s barcode and the barcode of every component piece fitted into it, and submits it for approval. An accessory also lists the products it is offered with and the extra discount with each.', where: 'Products Management' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Enters what one unit costs: each component\'s unit cost (filled from its purchase price) and extra costs such as manpower or software with their reasons, and checks the profit before and after tax shown in the form.', where: 'Products Management › Costing & profit' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Reviews the snapshot, including the GST split of the price, one unit\'s cost, margin and profit after tax, and the unit and piece barcodes, and approves, which activates the product and locks its barcodes.', where: 'Approvals Hub › Requests', otherwise: 'Reject → back with a reason; its pieces return to stock. Fix and resubmit; the barcodes entered last time are filled in' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Publishes it to the storefront. Later edits go for approval again; the live product stays unchanged until approved. Turning on a new version turns the previous version off.', where: 'Products Management' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Can buy it.' },
    ],
  },
  {
    id: 'barcode-trace',
    title: 'Tracing a device by its barcode',
    summary: 'Every piece and every product unit carries its own barcode, so a device can be traced back to each part\'s dealer.',
    steps: [
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'DEALER_MANAGER', 'CATALOG_SPECIALIST', 'FULFILLMENT_SPECIALIST', 'FINANCIAL_AUDITOR', 'SUPER_ADMIN'], label: 'Any role with Barcode Tracking', kind: 'maker', text: 'Scans or types the barcode on the device or on a part.', where: 'Barcode Tracking' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Shows the product unit and every part inside it, or the part and the unit it is fitted into: item, batch, purchase order, dealer, delivery date, who received and approved it, and its full history.' },
    ],
  },
  {
    id: 'barcode-correction',
    title: 'Correcting a barcode',
    summary: 'Barcodes are locked once approved. Only a Level 2 Super Admin changes one.',
    steps: [
      { who: ['STORE_MANAGER', 'FULFILLMENT_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager, Fulfillment or Super Admin', kind: 'maker', text: 'Opens the barcode and asks for a correction with the right code and a reason, or asks for barcodes for stock received before barcodes were recorded.', where: 'Barcode Tracking › Correct barcode · Stock details › Assign barcodes' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'checker', text: 'Approves or rejects the request. A Super Admin\'s own correction is applied at once.', where: 'Approvals Hub › Barcodes', otherwise: 'Reject → the barcode stays as it is; the requester is told why' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Records the change in the barcode\'s history; the old code is free again.' },
    ],
  },
  {
    id: 'customer-order',
    title: 'Customer order to the doorstep',
    summary: 'An order is confirmed only once it is fully paid. Every step moves forward only.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Places and pays for an order on the store.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Confirms the paid order, then moves it to processing and packed.', where: 'Customer Order Tracking', otherwise: 'Not paid → it cannot be confirmed yet' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Marks it shipped. Shipping costs entered here become expense vouchers.' },
      { who: ['FLEET_COORDINATOR', 'FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fleet Coordinator', kind: 'maker', text: 'Keeps tracking up to date while it is in transit.' },
      { who: ['DELIVERY_RIDER', 'FLEET_COORDINATOR'], label: 'Delivery Rider', kind: 'maker', text: 'Records out for delivery, then delivered, using the order\'s shipping address.', otherwise: 'Customer unavailable, invalid address or refused → re-attempt' },
      { who: ['FLEET_COORDINATOR', 'FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fleet Coordinator', kind: 'maker', text: 'Sends a parcel that cannot be delivered back to the warehouse.' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees every update in their order tracking.' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Anyone who sees costs', kind: 'end', text: 'Sees the order\'s profit on the order: each line at its cost when ordered, plus shipping charged less shipping paid, before and after tax.', where: 'Customer Order Tracking › order' },
    ],
  },
  {
    id: 'product-profit',
    title: 'Product cost and profit',
    summary: 'What a product costs to make and what it earns, from the product form to the books. Amounts exclude GST.',
    steps: [
      { who: ['DEALER_MANAGER', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager / Store Manager', kind: 'maker', text: 'Items are bought and their stock approved; each stock entry carries its purchase price and freight.', where: 'Procurement Orders, Stock' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'In the product form, each component\'s unit cost is filled from what the next unit in stock cost and can be adjusted. Adds extra costs (manpower, software, packaging…) with how each was worked out, and reads the live profit, margin, income tax and profit after tax.', where: 'Products Management › Costing & profit' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Sees one unit\'s cost, margin and profit after tax with the approval request. Cost changes to a live product go for approval like any other edit.', where: 'Approvals Hub › Requests', otherwise: 'Reject → back with a reason' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Every order line keeps the unit cost of the day it was ordered, so later cost changes never rewrite past profit. Shipping costs entered when the order ships are counted against that order.' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Anyone who sees costs', kind: 'end', text: 'Reads the profit of an order (order details), of a product (product details) and of every product in a period, before and after income tax.', where: 'Accounts & Finance › Product profit' },
    ],
  },
  {
    id: 'pre-order',
    title: 'Pre-orders',
    summary: 'A customer can order an item that is out of stock; staff accept it once stock is there.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Orders an out-of-stock item. It arrives as a pre-order.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Puts it on "Wait for stock" until enough stock arrives.', where: 'Customer Order Tracking' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment or Store Manager', kind: 'checker', text: 'Checks requested quantity against stock and accepts the pre-order. It must be fully paid.', where: 'Approvals Hub › Pre-orders', otherwise: 'Cancel if it cannot be fulfilled' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Stock is reserved and the order carries on like any other.' },
    ],
  },
  {
    id: 'customer-return',
    title: 'Customer return',
    summary: 'A delivered order can be returned; paid orders are refunded after inspection.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Asks to return a delivered order.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment or Store Manager', kind: 'checker', text: 'Approves or rejects the return.', where: 'Customer Order Tracking', otherwise: 'Reject → the order stays delivered and closes' },
      { who: ['FULFILLMENT_SPECIALIST', 'FLEET_COORDINATOR', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment / Fleet', kind: 'maker', text: 'Out for pickup, picked up, in transit, received at the warehouse.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Inspects the item, then refunds a paid order or closes an unpaid one.', otherwise: 'Inspection failed → no refund, order closes' },
    ],
  },
  {
    id: 'refund',
    title: 'Refund for a customer',
    summary: 'Refunds go through the payment gateway (Razorpay) after a Level 2 approval.',
    steps: [
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Requests a refund on the order.', where: 'Customer Order Tracking › order' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the refund, which sends it to the payment gateway.', where: 'Approvals Hub › Refunds', otherwise: 'Reject → with a reason; payment status goes back' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Re-checks the status with the gateway if it is slow.', otherwise: 'Refund failed → it can be initiated again' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Gets the money back; the order closes.' },
    ],
  },
  {
    id: 'support',
    title: 'Support ticket',
    summary: 'Customers raise tickets from the store; support answers them here.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Raises a ticket about an order or product.' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Opens the ticket, checks the linked order and picks or edits a suggested reply.', where: 'Support Tickets' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Sends the reply and updates the status (e.g. resolved).' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees the reply on the store.' },
    ],
  },
  {
    id: 'customer-change',
    title: 'Customer detail change',
    summary: 'A customer asks to correct their details; customer care asks and only the Super Admin changes them.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Asks support to correct their name, phone number or date of birth.' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER'], label: 'Customer Support', kind: 'maker', text: 'Opens the customer, fills in the new values and the reason and sends the request. Nothing changes yet.', where: 'Customer Management › Request change' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'checker', text: 'Gets a notification with the requested values, opens the customer from it, checks and saves the change with a reason.', where: 'Customer Management › Edit details', otherwise: 'If the request is wrong, the details are left as they are.' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees the corrected details in their account. The email address (their sign-in) is never changed here.' },
    ],
  },
  {
    id: 'reviews',
    title: 'Product reviews',
    summary: 'Store Managers decide which customer reviews show on the store.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Reviews a product they bought.' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager', kind: 'maker', text: 'Publishes or hides the review.', where: 'Reviews' },
      { who: ['CUSTOMER'], label: 'Storefront', kind: 'end', text: 'Published reviews count towards the product\'s rating.' },
    ],
  },
  {
    id: 'store-sale',
    title: 'Store sale (cash or online)',
    summary: 'An agent sells to a walk-in customer; cash they received counts at once, and the customer is emailed.',
    steps: [
      { who: ['SALES_AGENT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Sales Agent', kind: 'maker', text: 'Finds the customer by mobile number or email, or registers them with a delivery address (no password) after verifying their email with the 5-digit code sent to it.', where: 'Store Sales › New sale' },
      { who: ['SALES_AGENT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Sales Agent', kind: 'maker', text: 'Adds the products, gets the total and books the order: cash received (with the receipt number) or online. The sale is credited to them.', where: 'Store Sales › New sale' },
      { who: ['SYSTEM'], label: 'Company ledger', kind: 'end', text: 'Cash: the order is paid and confirmed at once, and the sale, shipping and GST collected are booked naming the agent. Fulfilment continues as for any order; the tax invoice is issued when it ships.' },
      { who: ['SYSTEM'], label: 'Customer email', kind: 'end', text: 'The customer is emailed the order, the receipt (PDF), how to sign in and track it, and for a new customer their user ID and a "Set my password" link (works once, for 15 minutes).', where: 'Store Sales › My sales shows whether it was sent' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Sets their password through the link (or "Forgot password" later); for an online sale, pays from their account.' },
      { who: ['STORE_MANAGER', 'FINANCE_MANAGER', 'FINANCIAL_AUDITOR', 'SUPER_ADMIN'], label: 'Store / Finance', kind: 'end', text: 'See every agent\'s sales, how they were paid and whether the customer was emailed.', where: 'Store Sales › All store sales' },
    ],
  },
  {
    id: 'order-emails',
    title: 'Order emails to the customer',
    summary: 'The customer hears about the steps that matter, at the email they verified.',
    steps: [
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfilment', kind: 'maker', text: 'Moves the order on: confirmed, shipped (the tax invoice is issued), out for delivery.', where: 'Order Tracking' },
      { who: ['DELIVERY_RIDER', 'FLEET_COORDINATOR'], label: 'Delivery', kind: 'maker', text: 'Records out for delivery and delivered at the door.', where: 'Order Tracking' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Emails the customer at each of those steps; the delivered email carries the GST tax invoice as a PDF. A cash store sale skips the confirmation email (its welcome email says so).' },
    ],
  },
  {
    id: 'email-setup',
    title: 'Customer email setup',
    summary: 'Customer and staff emails go out from the mail server and sender a Level 2 Super Admin sets.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Enters the mail server, port, security, login and the sender address and name, saves, and sends a test email.', where: 'Company Profile › Email' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Queued emails go out within a minute, with retries if the mail server is down; the card shows how many wait or failed. Until email is set up, verification codes and password links can\'t be sent, so new registrations and "Forgot password" wait for it.' },
    ],
  },
  {
    id: 'expense',
    title: 'Company expense or voucher',
    summary: 'Nothing is posted to the company account until a different Level 2 Finance Manager approves it.',
    steps: [
      { who: ['STORE_MANAGER', 'DEALER_MANAGER', 'FULFILLMENT_SPECIALIST', 'FLEET_COORDINATOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Any staff who raise expenses', kind: 'maker', text: 'Raises an expense and attaches the bill. The bill fills in the form; GST splits into CGST + SGST or IGST from the GSTINs.', where: 'Accounts & Finance › Expenses & vouchers' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves, rejects or later reverses it.', where: 'Approvals Hub › Expenses', otherwise: 'Reject → the maker can fix and resubmit while it awaits approval' },
      { who: ['SYSTEM'], label: 'Company ledger', kind: 'end', text: 'The entry is posted to the ledger. A GST bill\'s GST is claimed as input tax credit and recorded in the GST register, unless it was marked as blocked credit.' },
      { who: ['FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Financial Auditor', kind: 'end', text: 'Reviews the overview and ledger and exports PDF, Excel or Word reports.', where: 'Accounts & Finance' },
    ],
  },
  {
    id: 'salary',
    title: 'Monthly salary and payslip',
    summary: 'Salaries are transferred from the bank; nothing is booked or emailed until a different Level 2 confirms the transfer.',
    steps: [
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Transfers the salaries from the bank, then records them for the month: everyone unpaid at once at their monthly salary, or one employee with this month\'s bonus, overtime, unpaid leave, TDS or PF. Adds the transfer date and bank reference (UTR).', where: 'Payments & Chalans › choose the month' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Checks the transfers against the bank and confirms them (one by one or all waiting at once). Nobody confirms a salary they recorded or their own.', where: 'Payments & Chalans', otherwise: 'Reject with a reason → the recorder corrects it and records it again; before anyone decides, the recorder can also withdraw it' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Each confirmed salary is booked in Accounts & Finance under Salaries & staff costs (the net pay, on the transfer date) and the payslip PDF is emailed to the employee\'s personal email, or their sign-in email. A failed email is retried; "Resend" sends it again.' },
      { who: ANY_STAFF, label: 'Every employee', kind: 'end', text: 'Opens and downloads their payslip for any confirmed month. It is created fresh each time from the confirmed payment.', where: 'My Payslips' },
    ],
  },
  {
    id: 'client-demo',
    title: 'Client demo or meeting',
    summary: 'A visit to a client is planned as a quotation, approved, its bills recorded day by day, and its completion approved before the costs are booked as travel.',
    steps: [
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Schedules the trip step by step: the start date and number of days, then each client visited (kind of place, name, its own phone and email, address, PIN code (which fills in the city and state) and Google Maps location, contact person, legal name and GSTIN for businesses, and the day and time there, picked on the clock; visits never overlap, and the same client is never visited twice in a row on a day), Appointment or Promotion, the products to demo with each unit taken picked by its barcode (scanned, typed, or ticked from the product\'s units in stock; a unit another demo has on those days can\'t be picked), the attending staff, and the quotation: day by day, the optional journeys (as many as needed, one after another, each with its departure and arrival picked as one range (the day, then the time on the clock), in an order that can be changed by dragging, where time already taken by a visit or another journey is greyed out), night stay (a hotel client of the trip or another hotel, with check-in and check-out picked as one range) and meals with their expected amounts; the proposed budget is their total plus any extra, which needs its reason and breakup. Saves it as a draft or sends the quotation for approval.', where: 'Client Demos & Meetings › Schedule a demo' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves the budget before the visit. Nobody approves a demo they planned, sent or attend. The attending staff are told.', where: 'Approvals Hub › Client demos', otherwise: 'Reject with a reason → back to draft to fix and send again. Changing the budget or number of days of an approved demo sends it back here' },
      { who: ANY_STAFF, label: 'Attending staff', kind: 'maker', text: 'On the demo\'s days, scan the product units you take and Hand out: they leave stock (also on the storefront, so nobody can buy them meanwhile). After the demo, scan them back and Hand back: they are in stock again.', where: 'My Demos › the demo › Units taken', otherwise: 'A unit already sold online can\'t be handed out: pick another unit in the plan' },
      { who: ANY_STAFF, label: 'Attending staff', kind: 'maker', text: 'While the visit runs, record your own stay, food and travel bills for each day, with the invoice or ticket (PDF or photo). Invoices for the planned stays and meals are attached here too.', where: 'My Demos' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Keeps every bill of the visit (stay, food, travel, other costs with their reason) and, after the visit and once every unit taken is handed back, sends it for completion with the outcome. Changes to recorded bills need a reason; the demo\'s timeline keeps them all.', where: 'Client Demos & Meetings › the demo' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Checks the bills and invoices against the budget and approves the completion.', where: 'Approvals Hub › Client demos', otherwise: 'Reject with a reason → back to the running demo to correct its bills' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'The total spent is booked in Accounts & Finance under Travel & conveyance, dated the last day of the visit.' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Writes off, with the reason, a unit that did not come back from the demo (lost or damaged): it leaves stock for good with its parts, and the demo can then be completed.', where: 'Client Demos & Meetings › the demo › Units taken' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Only a Super Admin changes a completed demo: Reopen for correction with a reason, correct it, and send it for approval again. When it is approved, only the difference to what was booked is booked.', where: 'Client Demos & Meetings › the demo', otherwise: 'Until the correction is approved, what was booked stays booked' },
    ],
  },
  {
    id: 'gst',
    title: 'GST: charged, paid and filed',
    summary: 'Every GST rupee is recorded once, in the GST register, when the document that makes it due or claimable is final.',
    steps: [
      { who: ['SYSTEM'], label: 'Customer order ships', kind: 'end', text: 'The tax invoice is issued and its CGST + SGST or IGST becomes output tax of that month. A refund afterwards issues a credit note that takes its share back.', where: 'Accounts & Finance › GST' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves a dealer\'s stock entry: the purchase\'s GST (from the quotation) becomes input tax, claimable when the dealer has a GSTIN.', where: 'Approvals Hub › Requests' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves expense bills: their GST is input tax credit unless marked as blocked credit.', where: 'Approvals Hub › Expenses' },
      { who: ['FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance', kind: 'end', text: 'Each month: input tax credit is set off against output tax (IGST first; CGST never pays SGST). What is left is paid in cash with GSTR-3B (due on the 20th; GSTR-1 on the 11th).', where: 'Accounts & Finance › GST' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Raises the GST payment as a "GST paid to the government (challan)" voucher; a different Level 2 approves it and the outstanding amount drops.', where: 'Accounts & Finance › Expenses & vouchers' },
    ],
  },
  {
    id: 'company-profile',
    title: 'Company profile change',
    summary: 'The store\'s branding (logo, home page video, both sign-in pages) and legal details change only through an approved version, one section at a time.',
    steps: [
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager', kind: 'maker', text: 'Opens the section\'s tab, proposes a change, edits only that section and submits it. One change per section waits for approval. A draft can be withdrawn or deleted.', where: 'Company Profile › section tab' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Another Level 2', kind: 'checker', text: 'Sees only that section\'s changes and approves or rejects them.', where: 'Approvals Hub › Company profile', otherwise: 'Reject → back to the drafter with a reason' },
      { who: ['SYSTEM'], label: 'Company profile', kind: 'end', text: 'That section goes live; the other sections stay as they are. Earlier versions stay in history.' },
    ],
  },
];

/** Good to know for everyone. */
export const GENERAL_NOTES: string[] = [
  'Level 1 prepares work, Level 2 also approves it. Roles with nothing to approve always work at Level 1.',
  'You never approve your own request: the maker and the approver are always two different people.',
  'Approve is green, reject and delete are red, caution actions are amber.',
  'If you open a page you are not allowed to see, the portal tells you so. Ask a Super Admin to change your designation or level.',
];

const isRole = (actor: GuideActor): actor is GuideRoleId => actor in ROLE_GUIDES;

/** The flows a role takes part in, in guide order. */
export const flowsFor = (role: GuideRoleId): GuideFlow[] => GUIDE_FLOWS.filter((flow) => flow.steps.some((step) => step.who.includes(role)));

/** Whether this step is one the role does itself. */
export const isOwnStep = (step: FlowStep, role: GuideRoleId | null): boolean => !!role && step.who.includes(role);

/** The roles that appear in a flow. */
export const rolesIn = (flow: GuideFlow): GuideRoleId[] => [...new Set(flow.steps.flatMap((step) => step.who.filter(isRole)))];
