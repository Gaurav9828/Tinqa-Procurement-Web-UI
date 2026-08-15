import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Package, 
  Gavel, 
  Users, 
  AlertCircle, 
  BarChart3, 
  Sun, 
  Moon, 
  CreditCard,
  LogOut,
  Loader2,
  Folder,
  Settings,
  HelpCircle,
  UserCheck,
  Boxes,
  Tag,
  ShoppingBag,
  FileText,
  LayoutDashboard
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../api/services/authService';
import { APP_NAVIGATION } from '../../config/permissions.config';
import type { UserRole } from '../../config/permissions.config';
import { NotificationBell } from '../../components/notifications/NotificationBell';

// Comprehensive Icon mapping dictionary
const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2,
  Package,
  Gavel,
  Users,
  CreditCard,
  AlertCircle,
  BarChart3,
  Folder,
  Settings,
  UserCheck,
  Boxes,
  Tag,
  ShoppingBag,
  FileText,
  LayoutDashboard,
};

export const AdminLayout: React.FC = () => {
  const { isDark, toggleTheme, initTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Ignore API errors during logout cleanup
    } finally {
      logout();
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  // Filter navigation links based on user's current role
  const visibleNavItems = useMemo(() => {
    const currentRole = (user?.role as UserRole) || 'ADMIN_L1';
    return APP_NAVIGATION.filter((item) =>
      item.allowedRoles.includes(currentRole)
    );
  }, [user?.role]);

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'A';

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-black text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-200">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-50 apple-glass px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo/TinQa.png" 
            alt="TinQa Logo" 
            className="w-8 h-8 object-contain rounded-lg shadow-sm"
          />
          <span className="font-semibold text-lg tracking-tight flex items-center">
            TinQa Procurement 
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-[#0071e3] dark:text-blue-400 ml-2 font-mono uppercase">
              {user?.role || 'Admin'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell Icon */}
          <NotificationBell />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
          
          {/* Profile Entry */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 pl-3 border-l border-black/10 dark:border-white/10 hover:opacity-80 transition-opacity text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-white text-xs font-semibold shadow-sm group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-medium group-hover:text-[#0071e3] transition-colors capitalize">
                {user?.username || 'Admin'}
              </p>
              <p className="text-gray-400 dark:text-neutral-500">
                {user?.email || 'admin@tinqa.com'}
              </p>
            </div>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Sign Out"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 gap-6">
        <aside className="w-64 hidden md:block shrink-0">
          <div className="bg-white dark:bg-[#161617] rounded-2xl p-3 sticky top-20 flex flex-col gap-1 border border-black/10 dark:border-white/10 shadow-sm transition-colors duration-200">
            <p className="px-3 py-2 text-[11px] font-bold tracking-wider text-gray-400 dark:text-neutral-500 uppercase select-none">
              Management Modules
            </p>
            
            {visibleNavItems.map((item) => {
              const Icon = ICON_MAP[item.iconName] || HelpCircle;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#0071e3] text-white shadow-sm font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon 
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive 
                            ? 'text-white' 
                            : 'text-gray-400 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white'
                        }`} 
                      />
                      <span className={isActive ? 'text-white' : ''}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};