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

// Feature modules are code-split so the login screen does not ship every admin page.
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ApprovalsHub = lazy(() => import('./features/approvals/ApprovalsHub').then((m) => ({ default: m.ApprovalsHub })));
const EmployeeManagementPage = lazy(() =>
  import('./features/employee-management/pages/EmployeeManagementPage').then((m) => ({ default: m.EmployeeManagementPage }))
);
const ItemManagementPage = lazy(() =>
  import('./features/item-management/pages/ItemManagementPage').then((m) => ({ default: m.ItemManagementPage }))
);
const DealerManagementPage = lazy(() =>
  import('./features/dealer-management/pages/DealerManagementPage').then((m) => ({ default: m.DealerManagementPage }))
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
const CustomerDetailPage = lazy(() =>
  import('./features/customer-management/pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage }))
);
const ReviewsPage = lazy(() => import('./features/reviews/pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const ProductManagementPage = lazy(() =>
  import('./features/products-management/pages/ProductManagementPage').then((m) => ({ default: m.ProductManagementPage }))
);

const DealerQuotationsPage = lazy(() =>
  import('./features/dealer-portal/pages/DealerQuotationsPage').then((m) => ({ default: m.DealerQuotationsPage }))
);
const DealerOrdersPage = lazy(() =>
  import('./features/dealer-portal/pages/DealerOrdersPage').then((m) => ({ default: m.DealerOrdersPage }))
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

                {/* Dealer logins */}
                <Route element={<RequireNavAccess navId="dealer-quotations" />}>
                  <Route path="dealer/quotations" element={<DealerQuotationsPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="dealer-orders" />}>
                  <Route path="dealer/orders" element={<DealerOrdersPage />} />
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
                <Route element={<RequireNavAccess navId="dealers" />}>
                  <Route path="dealers" element={<DealerManagementPage />} />
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
