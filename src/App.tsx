import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { ApprovalsHub } from './features/approvals/ApprovalsHub';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorPage } from './pages/ErrorPage';
import { AuthProvider } from './context/AuthContext';
import { EmployeeManagementPage } from './features/employee-management/pages/EmployeeManagementPage';
import { ItemManagementPage } from './features/item-management/pages/ItemManagementPage';
import { DealerManagementPage } from './features/dealer-management/pages/DealerManagementPage';
import { StockManagementPage } from './features/stock-management/pages/StockManagementPage';
import { OrderManagementPage } from './features/order-management/pages/OrderManagementPage';

/* Wrapper component to pass navigation handlers to ErrorPage */
const ErrorPageRoute: React.FC = () => {
  return <GlobalErrorPage />;
};

export const App: React.FC = () => {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/error" element={<ErrorPageRoute />} />

            {/* Protected Admin Routes */}
              <Route path="/" element={<AdminLayout />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/employees" element={<EmployeeManagementPage />} />
                <Route path="/dealers" element={<DealerManagementPage />} />
                <Route path="/item" element={<ItemManagementPage />} />
                <Route path='/stocks' element={<StockManagementPage />} />
                <Route path='/orders' element={<OrderManagementPage />} />
                <Route index element={<Navigate to="/analytics" replace />} />
                <Route path="approvals" element={<ApprovalsHub />} />
                <Route path="orders" element={<div className="p-8 apple-card">Orders Module Container</div>} />
                <Route path="auctions" element={<div className="p-8 apple-card">Auctions Module Container</div>} />
                <Route path="dealers" element={<div className="p-8 apple-card">Dealers Module Container</div>} />
                <Route path="payments" element={<div className="p-8 apple-card">Payments & Chalans Container</div>} />
                <Route path="complaints" element={<div className="p-8 apple-card">Complaints & Claims Container</div>} />
                <Route path="analytics" element={<div className="p-8 apple-card">Analytics Container</div>} />
              </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
};

export default App;