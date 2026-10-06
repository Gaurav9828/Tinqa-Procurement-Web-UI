import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorPage } from './pages/ErrorPage';
import { GlobalAlertContainer } from './components/ui/GlobalAlertContainer';
import { RedirectIfAuthenticated, RequireAuth, RequireNavAccess } from './auth/RouteGuards';

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
const ProductManagementPage = lazy(() =>
  import('./features/products-management/pages/ProductManagementPage').then((m) => ({ default: m.ProductManagementPage }))
);

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
            <Route path="/error" element={<GlobalErrorPage />} />

            {/* Signed-in, but allowed while a default password is still active */}
            <Route element={<RequireAuth allowFirstLogin />}>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<RequireAuth />}>
              <Route path="/" element={<AdminLayout />}>
                <Route index element={<Navigate to="/analytics" replace />} />
                <Route path="profile" element={<ProfilePage />} />

                <Route element={<RequireNavAccess navId="analytics" />}>
                  <Route path="analytics" element={<Placeholder title="Analytics Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="approvals" />}>
                  <Route path="approvals" element={<ApprovalsHub />} />
                </Route>
                <Route element={<RequireNavAccess navId="orders" />}>
                  <Route path="orders" element={<OrderManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="order-tracking" />}>
                  <Route path="order-tracking" element={<OrderTrackingPage />} />
                  <Route path="order-tracking/:orderNumber" element={<OrderTrackingDetailPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="support-tickets" />}>
                  <Route path="support-tickets" element={<SupportTicketsPage />} />
                  <Route path="support-tickets/:referenceNumber" element={<SupportTicketDetailPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="employees" />}>
                  <Route path="employees" element={<EmployeeManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="items" />}>
                  <Route path="item" element={<ItemManagementPage />} />
                </Route>
                <Route element={<RequireNavAccess navId="stocks" />}>
                  <Route path="stocks" element={<StockManagementPage />} />
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
                  <Route path="payments" element={<Placeholder title="Payments & Chalans Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="complaints" />}>
                  <Route path="complaints" element={<Placeholder title="Complaints & Claims Container" />} />
                </Route>
                <Route element={<RequireNavAccess navId="documents" />}>
                  <Route path="documents" element={<Placeholder title="Document Library Container" />} />
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
