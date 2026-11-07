import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { SetPasswordPage } from './components/auth/SetPasswordPage';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorPage } from './pages/ErrorPage';
import { GlobalAlertContainer } from './components/ui/GlobalAlertContainer';
import { HomeRedirect, RedirectIfAuthenticated, RequireAuth, RequireNavAccess } from './auth/RouteGuards';
import { RequireMeetingAccess } from './features/meetings/components/RequireMeetingAccess';

// Feature modules are code-split so the login screen does not ship every admin page.
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ApprovalsHub = lazy(() => import('./features/approvals/ApprovalsHub').then((m) => ({ default: m.ApprovalsHub })));
const EmployeeManagementPage = lazy(() =>
  import('./features/employee-management/pages/EmployeeManagementPage').then((m) => ({ default: m.EmployeeManagementPage }))
);
const ItemManagementPage = lazy(() =>
  import('./features/item-management/pages/ItemManagementPage').then((m) => ({ default: m.ItemManagementPage }))
);
const SupplierManagementPage = lazy(() =>
  import('./features/supplier-management/pages/SupplierManagementPage').then((m) => ({ default: m.SupplierManagementPage }))
);
const StockManagementPage = lazy(() =>
  import('./features/stock-management/pages/StockManagementPage').then((m) => ({ default: m.StockManagementPage }))
);
const OrderManagementPage = lazy(() =>
  import('./features/order-management/pages/OrderManagementPage').then((m) => ({ default: m.OrderManagementPage }))
);
const OrderTrackingPage = lazy(() =>
  import('./features/order-tracking/pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage }))
);
const OrderTrackingDetailPage = lazy(() =>
  import('./features/order-tracking/pages/OrderTrackingDetailPage').then((m) => ({ default: m.OrderTrackingDetailPage }))
);
const SupportTicketsPage = lazy(() =>
  import('./features/support-tickets/pages/SupportTicketsPage').then((m) => ({ default: m.SupportTicketsPage }))
);
const SupportTicketDetailPage = lazy(() =>
  import('./features/support-tickets/pages/SupportTicketDetailPage').then((m) => ({ default: m.SupportTicketDetailPage }))
);
const CustomersPage = lazy(() =>
  import('./features/customer-management/pages/CustomersPage').then((m) => ({ default: m.CustomersPage }))
);
const PromoCodesPage = lazy(() => import('./features/promo-codes/pages/PromoCodesPage').then((m) => ({ default: m.PromoCodesPage })));
const CustomerDetailPage = lazy(() =>
  import('./features/customer-management/pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage }))
);
const ReviewsPage = lazy(() => import('./features/reviews/pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const ProductManagementPage = lazy(() =>
  import('./features/products-management/pages/ProductManagementPage').then((m) => ({ default: m.ProductManagementPage }))
);

const SupplierQuotationsPage = lazy(() =>
  import('./features/supplier-portal/pages/SupplierQuotationsPage').then((m) => ({ default: m.SupplierQuotationsPage }))
);
const SupplierOrdersPage = lazy(() =>
  import('./features/supplier-portal/pages/SupplierOrdersPage').then((m) => ({ default: m.SupplierOrdersPage }))
);
const PrintOrderPage = lazy(() => import('./features/printing/pages/PrintOrderPage').then((m) => ({ default: m.PrintOrderPage })));

const FinancePage = lazy(() => import('./features/finance/pages/FinancePage').then((m) => ({ default: m.FinancePage })));

const CompanyProfilePage = lazy(() =>
  import('./features/company-profile/pages/CompanyProfilePage').then((m) => ({ default: m.CompanyProfilePage }))
);
const CompanyProfileEditorPage = lazy(() =>
  import('./features/company-profile/pages/CompanyProfileEditorPage').then((m) => ({ default: m.CompanyProfileEditorPage }))
);
const CompanyProfileReviewPage = lazy(() =>
  import('./features/company-profile/pages/CompanyProfileReviewPage').then((m) => ({ default: m.CompanyProfileReviewPage }))
);
const CompanyProfileHistoryPage = lazy(() =>
  import('./features/company-profile/pages/CompanyProfileHistoryPage').then((m) => ({ default: m.CompanyProfileHistoryPage }))
);

const StoreSalesPage = lazy(() => import('./features/store-sales/pages/StoreSalesPage').then((m) => ({ default: m.StoreSalesPage })));
const PaymentsPage = lazy(() => import('./features/payroll/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const MyPayslipsPage = lazy(() => import('./features/payroll/pages/MyPayslipsPage').then((m) => ({ default: m.MyPayslipsPage })));
const BarcodeTrackingPage = lazy(() =>
  import('./features/barcodes/pages/BarcodeTrackingPage').then((m) => ({ default: m.BarcodeTrackingPage }))
);
const ClientDemosPage = lazy(() =>
  import('./features/client-demos/pages/ClientDemosPage').then((m) => ({ default: m.ClientDemosPage }))
);
const ClientDemoWizardPage = lazy(() =>
  import('./features/client-demos/pages/ClientDemoWizardPage').then((m) => ({ default: m.ClientDemoWizardPage }))
);
const ClientDemoDetailPage = lazy(() =>
  import('./features/client-demos/pages/ClientDemoDetailPage').then((m) => ({ default: m.ClientDemoDetailPage }))
);
const MyDemosPage = lazy(() => import('./features/client-demos/pages/MyDemosPage').then((m) => ({ default: m.MyDemosPage })));
const ClientOutreachPage = lazy(() =>
  import('./features/client-outreach/pages/ClientOutreachPage').then((m) => ({ default: m.ClientOutreachPage }))
);
const OutreachBusinessPage = lazy(() =>
  import('./features/client-outreach/pages/OutreachBusinessPage').then((m) => ({ default: m.OutreachBusinessPage }))
);
const MyMeetingsPage = lazy(() => import('./features/meetings/pages/MyMeetingsPage').then((m) => ({ default: m.MyMeetingsPage })));
const MeetingDetailPage = lazy(() => import('./features/meetings/pages/MeetingDetailPage').then((m) => ({ default: m.MeetingDetailPage })));
const MeetingEditorPage = lazy(() => import('./features/meetings/pages/MeetingEditorPage').then((m) => ({ default: m.MeetingEditorPage })));
const MeetingFeedbackPage = lazy(() => import('./features/meetings/pages/MeetingFeedbackPage').then((m) => ({ default: m.MeetingFeedbackPage })));
const CareersPage = lazy(() => import('./features/careers/pages/CareersPage').then((m) => ({ default: m.CareersPage })));
const CareersApplicantsPage = lazy(() => import('./features/careers/pages/ApplicantsPages').then((m) => ({ default: m.ApplicantsPage })));
const OpeningApplicantsPage = lazy(() =>
  import('./features/careers/pages/ApplicantsPages').then((m) => ({ default: m.OpeningApplicantsPage }))
);
const OpeningEditorPage = lazy(() => import('./features/careers/pages/OpeningEditorPage').then((m) => ({ default: m.OpeningEditorPage })));
const ApplicationDetailPage = lazy(() =>
  import('./features/careers/pages/ApplicationDetailPage').then((m) => ({ default: m.ApplicationDetailPage }))
);
const UserGuidePage = lazy(() => import('./features/user-guide/pages/UserGuidePage').then((m) => ({ default: m.UserGuidePage })));

const PageLoader: React.FC = () => (
  <div className="min-h-[300px] flex items-center justify-center text-gray-400">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

const Placeholder: React.FC<{ title: string }> = ({ title }) => <div className="p-8 apple-card">{title}</div>;

export const App: React.FC = () => {
  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <GlobalAlertContainer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <RedirectIfAuthenticated>
                  <LoginPage />
                </RedirectIfAuthenticated>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <RedirectIfAuthenticated>
                  <ForgotPasswordPage />
                </RedirectIfAuthenticated>
              }
            />
            {/* An emailed password link (new account or forgot password): works signed in or not */}
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/error" element={<GlobalErrorPage />} />

            {/* Signed-in, but allowed while a default password is still active */}
            <Route element={<RequireAuth allowFirstLogin />}>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Printable quotations, purchase orders and bills: no app chrome. The page loads only what the user may see. */}
            <Route element={<RequireAuth />}>
              <Route path="/print/orders/:orderId/:document" element={<PrintOrderPage />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<RequireAuth />}>
              <Route path="/" element={<AdminLayout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="profile" element={<ProfilePage />} />

                {/* Supplier logins */}
                <Route element={<RequireNavAccess navId="supplier-quotations" />}>
                  <Route path="supplier/quotations" element={<SupplierQuotationsPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="supplier-orders" />}>
                  <Route path="supplier/orders" element={<SupplierOrdersPage />} />
                </Route>

                <Route element={<RequireNavAccess navId="analytics" />}>
                  <Route path="analytics" element={<Placeholder title="Analytics Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="finance" />}>
                  <Route path="finance" element={<FinancePage />} />
                </Route>
                <Route element={<RequireNavAccess navId="approvals" />}>
                  <Route path="approvals" element={<ApprovalsHub />} />
                </Route>
                <Route element={<RequireNavAccess navId="orders" />}>
                  <Route path="orders" element={<OrderManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="store-sales" />}>
                  <Route path="store-sales" element={<StoreSalesPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="order-tracking" />}>
                  <Route path="order-tracking" element={<OrderTrackingPage />} />
                  <Route path="order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="customers" />}>
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="customers/:customerId" element={<CustomerDetailPage />} />
                </Route>
                {/* Promo codes: viewers read them; creating, editing and switching off needs PROMO_CODE_MANAGE */}
                <Route element={<RequireNavAccess navId="promo-codes" />}>
                  <Route path="promo-codes" element={<PromoCodesPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="support-tickets" />}>
                  <Route path="support-tickets" element={<SupportTicketsPage />} />
                  <Route path="support-tickets/:referenceNumber" element={<SupportTicketDetailPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="reviews" />}>
                  <Route path="reviews" element={<ReviewsPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="employees" />}>
                  <Route path="employees" element={<EmployeeManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="items" requires={['ITEM_VIEW']} />}>
                  <Route path="item" element={<ItemManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="items" requires={['STOCK_VIEW']} />}>
                  <Route path="item/stocks" element={<StockManagementPage />} />
                </Route>
                {/* Old sidebar link; stock management now lives under Item Management. */}
                <Route path="stocks" element={<Navigate to="/item/stocks" replace />} />
                <Route element={<RequireNavAccess navId="barcodes" />}>
                  <Route path="barcodes" element={<BarcodeTrackingPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="products" />}>
                  <Route path="products" element={<ProductManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="suppliers" />}>
                  <Route path="suppliers" element={<SupplierManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="auctions" />}>
                  <Route path="auctions" element={<Placeholder title="Auctions Module Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="payments" />}>
                  <Route path="payments" element={<PaymentsPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="my-payslips" />}>
                  <Route path="my-payslips" element={<MyPayslipsPage />} />
                </Route>
                {/* Client demos & meetings: scheduled step by step, decided on the demo's page; attending staff under My Demos */}
                <Route element={<RequireNavAccess navId="client-demos" />}>
                  <Route path="client-demos" element={<ClientDemosPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="client-demos" requires={['DEMO_VIEW']} />}>
                  <Route path="client-demos/:id" element={<ClientDemoDetailPage mode="manager" />} />
                </Route>
                <Route element={<RequireNavAccess navId="client-demos" requires={['DEMO_MANAGE']} />}>
                  <Route path="client-demos/new" element={<ClientDemoWizardPage key="new" />} />
                  <Route path="client-demos/:id/edit" element={<ClientDemoWizardPage key="edit" />} />
                </Route>
                <Route element={<RequireNavAccess navId="my-demos" />}>
                  <Route path="my-demos" element={<MyDemosPage />} />
                  <Route path="my-demos/:id" element={<ClientDemoDetailPage mode="attendee" />} />
                </Route>
                {/* Client outreach: businesses we pitch to and every contact with them */}
                <Route element={<RequireNavAccess navId="client-outreach" />}>
                  <Route path="client-outreach" element={<ClientOutreachPage />} />
                  <Route path="client-outreach/businesses/:id" element={<OutreachBusinessPage />} />
                </Route>
                {/* Meetings: listed under Client Demos & Meetings › Meetings and My Meetings; a meeting's page opens from either and from emailed links */}
                <Route element={<RequireNavAccess navId="my-meetings" />}>
                  <Route path="my-meetings" element={<MyMeetingsPage />} />
                </Route>
                <Route element={<RequireMeetingAccess requires={['MEETING_SCHEDULE']} />}>
                  <Route path="meetings/new" element={<MeetingEditorPage key="new" />} />
                  <Route path="meetings/:id/edit" element={<MeetingEditorPage key="edit" />} />
                </Route>
                <Route element={<RequireMeetingAccess requires={['MEETING_VIEW_ALL', 'MEETING_VIEW_OWN']} />}>
                  <Route path="meetings/:id" element={<MeetingDetailPage />} />
                </Route>
                <Route element={<RequireMeetingAccess requires={['MEETING_RESPOND_OWN']} />}>
                  <Route path="meetings/:id/feedback" element={<MeetingFeedbackPage />} />
                </Route>
                {/* Careers: openings and their applicants; posting needs CAREER_OPENING_MANAGE */}
                <Route element={<RequireNavAccess navId="careers" />}>
                  <Route path="careers" element={<CareersPage />} />
                  <Route path="careers/applicants" element={<CareersApplicantsPage />} />
                  <Route path="careers/applications/:id" element={<ApplicationDetailPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="careers" requires={['CAREER_OPENING_VIEW']} />}>
                  <Route path="careers/openings/:id" element={<OpeningApplicantsPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="careers" requires={['CAREER_OPENING_MANAGE']} />}>
                  <Route path="careers/openings/new" element={<OpeningEditorPage key="new" />} />
                  <Route path="careers/openings/:id/edit" element={<OpeningEditorPage key="edit" />} />
                </Route>
                <Route element={<RequireNavAccess navId="complaints" />}>
                  <Route path="complaints" element={<Placeholder title="Complaints & Claims Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="documents" />}>
                  <Route path="documents" element={<Placeholder title="Document Library Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="company-profile" />}>
                  <Route path="settings/company-profile" element={<CompanyProfilePage />} />
                  <Route path="settings/company-profile/history" element={<CompanyProfileHistoryPage />} />
                  <Route path="settings/company-profile/drafts/:id" element={<CompanyProfileEditorPage />} />
                  <Route path="settings/company-profile/versions/:id" element={<CompanyProfileReviewPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="user-guide" />}>
                  <Route path="user-guide" element={<UserGuidePage />} />
                </Route>
                <Route element={<RequireNavAccess navId="system-settings" />}>
                  <Route path="settings" element={<Placeholder title="System Configuration Container" />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </GlobalErrorBoundary>
  );
};

export default App;
