import { PERMISSIONS } from '../../src/config/access';

/**
 * Backend answers for the end-to-end tests: Procurement (/api/v1/..., /api/auth/...) and E-commerce (/api/admin/...,
 * /api/company/...). Keep them in step with the backends when an API changes.
 */
export interface Session {
  user: {
    userId: number;
    username: string;
    email: string;
    role: string;
    authClient: string;
    isFirstLogin: boolean;
    designation: string | null;
    designationLabel: string | null;
    permissionGroups: string[];
    permissions: string[];
  };
}

// What a dealer login holds (as in src/test/access.ts); a Super Admin holds every other permission
const DEALER_PORTAL: readonly string[] = [
  'DEALER_PORTAL_VIEW',
  'DEALER_QUOTATION_SUBMIT',
  'DEALER_QUOTATION_CHANGE_REQUEST',
  'DEALER_ORDER_RESPOND',
  'DEALER_ORDER_SHIP',
];
const superAdminPermissions = PERMISSIONS.filter((p) => !DEALER_PORTAL.includes(p));

export const SUPER_ADMIN_SESSION: Session = {
  user: {
    userId: 1,
    username: 'e2e.admin',
    email: 'e2e.admin@tinqa.test',
    role: 'ADMIN_L2',
    authClient: 'WEB',
    isFirstLogin: false,
    designation: 'SUPER_ADMIN',
    designationLabel: 'Super Admin',
    permissionGroups: [],
    permissions: [...superAdminPermissions],
  },
};

export const DEALER_SESSION: Session = {
  user: {
    userId: 2,
    username: 'e2e.dealer',
    email: 'e2e.dealer@tinqa.test',
    role: 'DEALER',
    authClient: 'WEB',
    isFirstLogin: false,
    designation: null,
    designationLabel: null,
    permissionGroups: ['DEALER_PORTAL'],
    permissions: [...DEALER_PORTAL],
  },
};

/** `raw`: the body as is, for the few endpoints that answer without the { success, data } envelope (sign-in). */
export type Answer = { status: number; data?: unknown; errorCode?: string; raw?: unknown };
type Handler = (match: RegExpMatchArray, url: URL) => Answer;

const ok = (data: unknown): Answer => ({ status: 200, data });

export const page = <T>(content: T[], size = 20) => ({
  content,
  number: 0,
  size,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  first: true,
  last: true,
  empty: content.length === 0,
});

const myAccess = (session: Session) => ({
  role: session.user.role,
  designation: session.user.designation,
  designationLabel: session.user.designationLabel,
  permissionGroups: session.user.permissionGroups,
  permissions: session.user.permissions,
});

const notFound = (errorCode: string): Answer => ({ status: 404, errorCode });

/** A token-shaped value built at run time (never committed): the app only reads its expiry. */
export const e2eToken = (username: string): string => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: username, exp: 4_102_444_800 })}.e2e`;
};

const signIn = (session: Session): Answer => ({
  status: 200,
  raw: { accessToken: e2eToken(session.user.username), tokenType: 'Bearer', expiresIn: 86_400_000, ...session.user },
});

const ADMIN_PROFILE = {
  employeeId: 1,
  employeeCode: 'EMP-0001',
  displayName: 'E2E Admin',
  primaryPhone: '+91 9876543210',
  alternatePhone: null,
  personalEmail: 'e2e.admin@example.com',
  firstName: 'E2E',
  middleName: null,
  lastName: 'Admin',
  department: 'Procurement',
  designation: 'SUPER_ADMIN',
  designationLabel: 'Super Admin',
  workEmail: 'e2e.admin@tinqa.test',
  username: 'e2e.admin',
  gender: 'FEMALE',
  employmentType: 'FULL_TIME',
  joiningDate: '2020-01-01',
  dateOfBirth: '1990-05-20',
  status: 'ACTIVE',
};

const zeroPnl = {
  grossSales: 0, refunds: 0, revenue: 0, directCosts: 0, grossProfit: 0, operatingExpenses: 0, ebitda: 0,
  depreciationAmortization: 0, ebit: 0, otherIncome: 0, interest: 0, pbt: 0, tax: 0, pat: 0,
};

const financeOverview = (url: URL) => ({
  from: url.searchParams.get('from') ?? '2026-10-01',
  to: url.searchParams.get('to') ?? '2026-10-31',
  granularity: url.searchParams.get('granularity') ?? 'DAY',
  account: { name: 'TinQa', currency: 'INR', balancePaise: 0, entryCount: 0, firstEntryOn: null },
  profitAndLoss: { ...zeroPnl, grossMarginPct: null, ebitdaMarginPct: null, ebitMarginPct: null, netMarginPct: null },
  cashFlow: { openingBalance: 0, cashIn: 0, cashOut: 0, netCashFlow: 0, closingBalance: 0, operating: 0, investing: 0, financing: 0 },
  workingCapital: { currentAssets: 0, cash: 0, currentLiabilities: 0, pendingRefunds: 0, workingCapital: 0 },
  burn: { months: 0, monthlyBurn: 0, monthlyNetCashFlow: 0, runwayMonths: null, cashPositive: true },
  trend: [],
  categories: [],
  pending: { vouchers: 0, expensePaise: 0 },
  procurementSync: null,
  integrity: { balanced: true, accountBalance: 0, ledgerCashTotal: 0, accountEntryCount: 0, ledgerEntryCount: 0 },
});

// A promo code as POST /admin/promo-codes answers it (docs/promo-codes.md › Staff)
const PROMO_CODE = {
  id: 1, code: 'TINQA7KQ3MZP', description: 'E2E offer', discountType: 'PERCENTAGE', discountPercentage: 20, amountOff: null, customerScope: 'ALL', customerCount: 0,
  productScope: 'ALL', productCount: 0, maxUnitsPerProduct: null, usageLimitPerCustomer: 1, totalUsageLimit: null,
  startsOn: '2026-11-04', expiresOn: '2099-12-31', active: true, status: 'ACTIVE', timesUsed: 0, totalDiscountGiven: 0,
  createdBy: 'e2e.admin', createdAt: '2026-11-04T10:00:00', updatedBy: null, updatedAt: '2026-11-04T10:00:00',
  deletedBy: null, deletedAt: null, customers: [], products: [],
};

const TRACKING_STATUSES = ['ORDER_RECEIVED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => ({ status, stage: status }));

/**
 * method + path (after /api) -> answer, for the signed-in account. Lists are empty (each screen's empty state), single
 * records answer 404 as the backends do for an unknown id. Unlisted calls get 501, are reported, and fail strict builds.
 */
export const handlers = (session: Session): [string, RegExp, Handler][] => [
  // Procurement
  ['POST', /^\/auth\/admin\/login$/, () => signIn(SUPER_ADMIN_SESSION)],
  ['GET', /^\/v1\/access\/me$/, () => ok(myAccess(session))],
  ['GET', /^\/v1\/access\/catalog$/, () => ok({ designations: [], groups: [], permissions: [] })],
  ['GET', /^\/v1\/notifications\/unread-count$/, () => ok({ unreadCount: 0 })],
  ['GET', /^\/v1\/notifications$/, () => ok([])],
  ['GET', /^\/v1\/admin\/profile$/, () => ok(ADMIN_PROFILE)],
  ['GET', /^\/v1\/admin\/items$/, () => ok(page([]))],
  ['GET', /^\/v1\/admin\/items\/categories$/, () => ok([])],
  ['GET', /^\/v1\/stocks$/, () => ok([])],
  ['GET', /^\/v1\/admin\/dealers$/, () => ok(page([]))],
  ['GET', /^\/v1\/admin\/dealers\/categories$/, () => ok([])],
  ['GET', /^\/v1\/admin\/dealers\/cities$/, () => ok([])],
  ['GET', /^\/v1\/admin\/dealer-logins$/, () => ok([])],
  ['GET', /^\/v1\/admin\/employees$/, () => ok(page([]))],
  ['GET', /^\/v1\/admin\/employees\/pending-approvals$/, () => ok([])],
  ['GET', /^\/v1\/orders$/, () => ok([])],
  ['GET', /^\/v1\/orders\/change-requests$/, () => ok([])],
  ['GET', /^\/v1\/orders\/status\/\w+$/, () => ok([])],
  ['GET', /^\/v1\/orders\/\d+$/, () => notFound('ORDER_NOT_FOUND')],
  ['GET', /^\/v1\/documents$/, () => ok([])],
  // Approvals hub badges: nothing waiting in any queue
  ['GET', /^\/v1\/approvals\/summary$/, () => ok({})],
  ['GET', /^\/v1\/product-approvals$/, () => ok([])],
  ['GET', /^\/v1\/product-approvals\/latest$/, () => ok([])],
  // Barcodes: the Approvals hub's queue, a stock entry's or product's units, and a trace (none recorded)
  ['GET', /^\/v1\/barcodes\/requests$/, () => ok([])],
  ['GET', /^\/v1\/barcodes$/, () => ok([])],
  ['GET', /^\/v1\/barcodes\/products\/\d+$/, () => ok([])],
  ['GET', /^\/v1\/barcodes\/trace\/[^/]+$/, () => notFound('BARCODE_NOT_FOUND')],
  ['GET', /^\/v1\/store-sales\/units\/lookup$/, () => notFound('BARCODE_NOT_FOUND')],
  ['GET', /^\/v1\/admin\/payroll\/years\/(\d+)$/, (m) => ok({ year: Number(m[1]), months: [], approvedNetPay: 0 })],
  ['GET', /^\/v1\/admin\/payroll\/years\/(\d+)\/months\/(\d+)$/, (m) => ok({
    year: Number(m[1]), month: Number(m[2]), open: false, payableEmployees: 0, notRecorded: 0, pendingApproval: 0, approved: 0,
    pendingNetPay: 0, approvedNetPay: 0, rows: [],
  })],
  ['GET', /^\/v1\/payroll\/my-payslips$/, () => ok([])],
  // Client demos: none planned, nothing waiting, nobody to tag
  ['GET', /^\/v1\/admin\/client-demos$/, () => ok([])],
  ['GET', /^\/v1\/admin\/client-demos\/waiting$/, () => ok([])],
  ['GET', /^\/v1\/admin\/client-demos\/staff$/, () => ok([])],
  ['GET', /^\/v1\/admin\/client-demos\/units$/, () => ok([])],
  ['GET', /^\/v1\/admin\/client-demos\/units\/lookup$/, () => notFound('BARCODE_NOT_FOUND')],
  ['GET', /^\/v1\/admin\/client-demos\/\d+$/, () => notFound('RESOURCE_NOT_FOUND')],
  ['GET', /^\/v1\/client-demos\/mine$/, () => ok([])],
  ['GET', /^\/v1\/client-demos\/mine\/\d+$/, () => notFound('RESOURCE_NOT_FOUND')],
  // Meetings: none scheduled, nobody to invite, no feedback waiting; an unknown meeting answers 404 as the backend does
  ['GET', /^\/v1\/meetings$/, () => ok(page([]))],
  ['GET', /^\/v1\/meetings\/mine$/, () => ok(page([]))],
  ['GET', /^\/v1\/meetings\/invitable-staff$/, () => ok(page([]))],
  ['GET', /^\/v1\/meetings\/busy$/, () => ok([])],
  ['GET', /^\/v1\/meetings\/\d+$/, () => notFound('MEETING_NOT_FOUND')],
  ['GET', /^\/v1\/meetings\/\d+\/feedback(\/mine)?$/, () => notFound('MEETING_NOT_FOUND')],
  // Custom roles: none yet (the role list and the groups the admin may grant)
  ['GET', /^\/v1\/access\/roles$/, () => ok([])],
  ['GET', /^\/v1\/access\/roles\/grantable-groups$/, () => ok([])],
  // Client outreach: no businesses or contacts yet; an unknown business or proof answers 404
  ['GET', /^\/v1\/outreach\/summary$/, () => ok({
    totalContacts: 0, businessesContacted: 0, newBusinesses: 0, demoRequests: 0, followUpsDue: 0, byDay: [], byExecutive: [],
    byChannel: {}, byInterest: {},
  })],
  ['GET', /^\/v1\/outreach\/businesses$/, () => ok(page([]))],
  ['GET', /^\/v1\/outreach\/businesses\/\d+$/, () => notFound('RESOURCE_NOT_FOUND')],
  ['GET', /^\/v1\/outreach\/businesses\/\d+\/contacts$/, () => ok(page([], 10))],
  ['GET', /^\/v1\/outreach\/contacts$/, () => ok(page([]))],
  ['GET', /^\/v1\/outreach\/contacts\/\d+\/proofs\/\d+$/, () => notFound('RESOURCE_NOT_FOUND')],
  ['GET', /^\/v1\/outreach\/follow-ups$/, () => ok(page([], 10))],
  ['GET', /^\/v1\/dealer-portal\/quotations$/, () => ok([])],
  ['GET', /^\/v1\/dealer-portal\/orders$/, () => ok([])],
  // E-commerce
  ['GET', /^\/company\/profile$/, () => ok({ brandName: 'TinQa', adminLoginHeadline: 'Procurement, sales & delivery — one workspace.' })],
  ['GET', /^\/admin\/company\/profile$/, () => ok({ live: null, pendingChanges: [], myDrafts: [] })],
  ['GET', /^\/admin\/company\/profile\/versions$/, () => ok(page([]))],
  ['GET', /^\/admin\/company\/profile\/versions\/\d+$/, () => notFound('COMPANY_PROFILE_VERSION_NOT_FOUND')],
  ['GET', /^\/admin\/approvals\/summary$/, () => ok({})],
  ['GET', /^\/admin\/orders$/, () => ok(page([]))],
  ['GET', /^\/admin\/orders\/tracking-statuses$/, () => ok(TRACKING_STATUSES)],
  ['GET', /^\/admin\/orders\/[^/]+$/, () => notFound('ORDER_NOT_FOUND')],
  ['GET', /^\/admin\/orders\/[^/]+\/refunds$/, () => notFound('ORDER_NOT_FOUND')],
  ['GET', /^\/admin\/refunds$/, () => ok(page([]))],
  ['GET', /^\/admin\/finance\/overview$/, (_m, url) => ok(financeOverview(url))],
  ['GET', /^\/admin\/finance\/vouchers$/, () => ok(page([]))],
  ['GET', /^\/admin\/finance\/categories$/, () => ok([])],
  ['GET', /^\/admin\/support\/queries$/, () => ok(page([]))],
  ['GET', /^\/admin\/support\/queries\/[^/]+$/, () => notFound('TICKET_NOT_FOUND')],
  ['GET', /^\/admin\/profile-approvals$/, () => ok([])],
  ['GET', /^\/admin\/customers$/, () => ok(page([]))],
  ['GET', /^\/admin\/customers\/\d+(\/(cart|orders|tickets))?$/, () => notFound('CUSTOMER_NOT_FOUND')],
  // Promo codes: none yet; the create form's code suggestion; an unknown code answers 404 as the backend does
  ['GET', /^\/admin\/promo-codes$/, () => ok(page([]))],
  ['GET', /^\/admin\/promo-codes\/code-suggestion$/, () => ok({ code: 'TINQA7KQ3MZP' })],
  ['GET', /^\/admin\/promo-codes\/\d+$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['GET', /^\/admin\/promo-codes\/\d+\/redemptions$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['POST', /^\/admin\/promo-codes$/, () => ok(PROMO_CODE)],
  ['PUT', /^\/admin\/promo-codes\/\d+$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['PATCH', /^\/admin\/promo-codes\/\d+\/status$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['DELETE', /^\/admin\/promo-codes\/\d+$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['POST', /^\/admin\/promo-codes\/\d+\/restore$/, () => notFound('PROMO_CODE_NOT_FOUND')],
  ['GET', /^\/admin\/reviews$/, () => ok(page([]))],
  ['GET', /^\/admin\/store-sales\/products$/, () => ok([])],
  ['GET', /^\/admin\/product-categories$/, () => ok([])],
  ['GET', /^\/admin\/costing\/settings$/, () => ok({ incomeTaxRate: 25 })],
  ['GET', /^\/admin\/settings\/email$/, () => ok({
    enabled: false, smtpHost: null, smtpPort: null, security: 'STARTTLS', username: null, passwordSet: false, fromAddress: null,
    fromName: null, replyTo: null, ready: false, updatedBy: null, updatedAt: null, pendingEmails: 0, failedEmails: 0,
  })],
  // Careers: no openings or applicants yet; an unknown opening or application answers 404 as the backend does
  ['GET', /^\/admin\/careers\/settings$/, () => ok({ enabled: true, updatedBy: null, updatedAt: null })],
  ['GET', /^\/admin\/careers\/categories$/, () => ok([])],
  ['GET', /^\/admin\/careers\/openings$/, () => ok(page([]))],
  ['GET', /^\/admin\/careers\/openings\/\d+$/, () => notFound('CAREER_OPENING_NOT_FOUND')],
  ['GET', /^\/admin\/careers\/applications$/, () => ok(page([]))],
  ['GET', /^\/admin\/careers\/applications\/\d+$/, () => notFound('CAREER_APPLICATION_NOT_FOUND')],
  ['GET', /^\/admin\/careers\/applications\/\d+\/resume$/, () => notFound('CAREER_APPLICATION_NOT_FOUND')],
  ['GET', /^\/products$/, () => ok([])],
  ['GET', /^\/products\/active$/, () => ok([])],
  // Description suggestions (only on "Suggest" in the product form): nothing found
  ['GET', /^\/products\/description-reference$/, () => ok(null)],
];
