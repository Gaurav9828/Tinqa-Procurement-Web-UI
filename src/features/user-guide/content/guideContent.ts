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
export const GUIDE_VERSION = '2.8';
export const GUIDE_UPDATED = '2026-10-21';

export const GUIDE_CHANGELOG: GuideChange[] = [
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
    menu: ['analytics', 'finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'support-tickets', 'reviews', 'employees',
      'items', 'products', 'dealers', 'payments', 'company-profile', 'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create employees with a designation and level, edit them, and request their removal',
      'See what every designation holds (Employee Management › Roles & permissions) and change an employee\'s access',
      'Everything every other staff role can do',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
      'Set up the mail server and sender of customer emails, and send a test (Company Profile › Email, Level 2)',
    ],
    approves: [
      'New employee accounts, employee deletions and profile changes',
      'Products, stock entries, procurement orders and returns, dealer logins and dealer quotation changes',
      'Refunds, expenses, company profile changes and documents',
      'Delete anyone\'s company profile draft',
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
    menu: ['analytics', 'finance', 'approvals', 'store-sales', 'order-tracking', 'support-tickets', 'reviews', 'items', 'products',
      'payments', 'company-profile', 'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create and edit items (with warranties) and products, submit them for approval and publish approved ones',
      'Move customer orders forward, update tracking and accept pre-orders once stock is there',
      'Book store sales for walk-in customers, like a Store Sales Agent, and follow every agent\'s sales',
      'Request refunds, reply to support tickets, publish or hide reviews',
      'Draft company profile changes, upload documents, raise expenses',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
    ],
    approves: ['Products and their changes before they go live', 'Stock entries', 'Refunds', 'Company profile changes'],
    tips: [
      'Pre-orders can be accepted at Level 1 too: Approvals Hub › Pre-orders.',
      'Dealers and procurement orders belong to the Dealer Manager; they are not in your menu.',
    ],
  },
  {
    id: 'DEALER_MANAGER',
    name: 'Dealer Manager',
    summary: 'Buys from suppliers: dealers, their web logins, quotations and procurement orders.',
    menu: ['finance', 'approvals', 'orders', 'items', 'products', 'dealers', 'payments'],
    hasApprovalLevel: true,
    does: [
      'Onboard, edit, activate or deactivate dealers and assign them item categories',
      'Create a dealer\'s web login, switch it off or reset its password',
      'Create quotation requests (RFQs), edit quotations and submit them for approval',
      'Move orders forward: shipped, delivered, returns and refunds',
      'Add the GST breakup to a quotation (optional): CGST + SGST or IGST, rate, HSN/SAC, cess',
      "Upload the dealer's invoice PDF when marking an order delivered; it is checked against the quotation",
      'Print the quotation, purchase order and bill of an order',
      'Approve or reject dealers\' changes to their quotations (Level 1 too)',
      'View the catalog and stock, upload documents, raise expenses',
    ],
    approves: [
      'Procurement orders (approve or reject) and the dealer\'s confirmation',
      "Accepting a dealer's invoice that doesn't match the quotation, or couldn't be read, with a reason",
      'Return requests',
      'Dealer logins created by someone else',
      'Removing a dealer',
    ],
    tips: [
      'While a dealer\'s change request is open the quotation is frozen for everyone until it is decided.',
      'Deactivating a dealer also switches off their login.',
      "An invoice that doesn't match is shown figure by figure: ask the dealer for a corrected invoice before accepting one by override.",
    ],
  },
  {
    id: 'CATALOG_SPECIALIST',
    name: 'Catalog Specialist',
    summary: 'Builds and maintains the product catalog.',
    menu: ['items', 'products'],
    hasApprovalLevel: false,
    does: [
      'Create, edit and delete items and item categories, including their warranties',
      'Create products from items, with components and warranties',
      'Set each product\'s HSN/SAC and GST rate; the price you enter is what the customer pays, GST included',
      'Mark a product as an accessory of other products, with an extra discount when bought together',
      'Submit products for approval and publish approved ones to the storefront',
      'View stock, upload documents',
    ],
    approves: [],
    tips: [
      'Editing a product that is already approved sends the change for approval; the live product stays as it is until then.',
      'Enter the GST-inclusive price (e.g. ₹59,999). The form shows the split for delivery in our state (CGST + SGST) and to other states (IGST); both add up to exactly that price. Orders keep the GST they were placed with even if the rate changes later.',
      'Products created before GST was recorded need their HSN/SAC and rate added the next time they are edited.',
      'Accessory extra discounts stack on the accessory\'s own discount: ₹1,000 at 10 % off is ₹900; with 5 % extra next to its product it is ₹855. Use 0 % to show it with a product without an extra discount.',
    ],
  },
  {
    id: 'FULFILLMENT_SPECIALIST',
    name: 'Fulfillment & Warehouse',
    summary: 'Receives stock and picks, packs and ships customer orders.',
    menu: ['finance', 'approvals', 'order-tracking', 'items', 'products'],
    hasApprovalLevel: false,
    does: [
      'Receive any delivered purchase order into stock, correct an entry\'s quantities, set storefront stock',
      'Confirm paid orders, then move them through processing, packed and shipped',
      'Accept pre-orders once stock is there (Approvals Hub › Pre-orders)',
      'Update shipment tracking, raise expenses (e.g. shipping costs)',
    ],
    approves: [],
    tips: ['Stock you record counts only after a Level 2 Store Manager approves it.'],
  },
  {
    id: 'DELIVERY_RIDER',
    name: 'Delivery Rider',
    summary: 'Delivers orders to the customer\'s door.',
    menu: ['order-tracking'],
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
    menu: ['finance', 'order-tracking'],
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
    menu: ['order-tracking', 'support-tickets', 'items', 'products'],
    hasApprovalLevel: false,
    does: [
      'View, reply to and change the status of support tickets; suggested replies help you answer quickly',
      'Look up the customer\'s order, payment and products from the ticket',
      'Request a refund and re-check its status with the payment gateway',
    ],
    approves: [],
    tips: ['Suggested replies are never sent by themselves: you choose and edit before sending.'],
  },
  {
    id: 'FINANCIAL_AUDITOR',
    name: 'Financial Auditor',
    summary: 'Checks the books. Read-only everywhere.',
    menu: ['analytics', 'finance', 'orders', 'store-sales', 'order-tracking', 'payments'],
    hasApprovalLevel: false,
    does: [
      'View the company account overview, ledger, expenses and vouchers',
      'Export finance reports as PDF, Excel or Word',
      'Check the GST position and register: output tax, input tax credit, payable in cash per month, paid and outstanding',
      'View payments, refunds, customer and procurement orders, documents',
      'See every agent\'s store sales (Store Sales)',
    ],
    approves: [],
    tips: [],
  },
  {
    id: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    summary: 'Runs company money: expenses, vouchers, payments and reports.',
    menu: ['analytics', 'finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'payments'],
    levelTwoMenu: ['approvals'],
    hasApprovalLevel: true,
    does: [
      'View and export the company account, ledger and reports',
      'Raise expenses and vouchers, record payments',
      'Track GST payable each month (Accounts & Finance › GST) and record GST paid to the government as a GST payment voucher',
      'View refunds, customer and procurement orders, documents',
      'See every agent\'s store sales and how they were paid (Store Sales)',
    ],
    approves: ['Expenses and vouchers: approve, reject or reverse (approving posts them to the ledger)', 'Payments and dealer payouts (coming soon)'],
    tips: ['You cannot approve a voucher you raised yourself.'],
  },
  {
    id: 'SALES_AGENT',
    name: 'Store Sales Agent',
    summary: 'Sells devices at a store or in the market, for cash or online payment.',
    menu: ['store-sales'],
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
      'Create quotations for TinQa, optionally with the GST breakup (CGST + SGST or IGST, rate, HSN/SAC, cess)',
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
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Submits the quotation for approval. It shows as "Under review" to the dealer.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the order, which then waits for the dealer.', where: 'Approvals Hub › Requests', otherwise: 'Reject → the order is cancelled' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Records that the dealer confirmed the order. The purchase order can now be printed.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN', 'DEALER'], label: 'Dealer or Dealer Manager', kind: 'maker', text: 'Marks the confirmed order as shipped once the goods have left. The procurement team is notified.', where: 'My Orders · Orders Management', otherwise: 'Cancel is possible only before shipment, with a reason' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: "Uploads the dealer's invoice PDF. TinQa reads it and checks the total, the GST and the dealer's GSTIN against the quotation.", where: 'Orders Management › Update status › Mark delivered' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: "Only when the invoice doesn't match or can't be read: accepts it with a reason, or asks the dealer for a corrected invoice.", where: 'Orders Management › Update status', otherwise: 'No override → upload a correct invoice; the order stays shipped' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Marks it delivered with the actual delivery date. The bill can now be printed.', where: 'Orders Management' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Picks the delivered order and records the units that passed testing. Nothing is booked yet; defected units go back.', where: 'Item Management › Stocks › Add stock' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the stock entry. Only now is the purchase booked to the company account, with its GST as input tax.', where: 'Approvals Hub › Requests', otherwise: 'Reject → stock is not added and nothing is booked' },
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
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the return once the dealer agrees.', otherwise: 'Reject → the order stays delivered and closes' },
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
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Creates the product from items (components), GST-inclusive price, GST rate and HSN/SAC, and warranties, and submits it for approval. An accessory also lists the products it is offered with and the extra discount with each.', where: 'Products Management' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Reviews the snapshot, including the GST split of the price, and approves, which activates the product.', where: 'Approvals Hub › Requests', otherwise: 'Reject → back with a reason; fix and resubmit' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Publishes it to the storefront. Later edits go for approval again; the live product stays unchanged until approved.', where: 'Products Management' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Can buy it.' },
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
