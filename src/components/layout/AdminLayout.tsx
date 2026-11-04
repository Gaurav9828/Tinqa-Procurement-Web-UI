import React, { Suspense, useEffect, useState, useMemo } from 'react';
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
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Store,
  LifeBuoy,
  Contact,
  Star,
  Building2,
  Wallet,
  BookOpen,
  ScanBarcode,
  Presentation,
  MapPin,
  Briefcase,
  CalendarClock,
  PhoneCall,
  TicketPercent
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../api/services/authService';
import { useAccess } from '../../hooks/useAccess';
import { useAccessSync } from '../../auth/useAccessSync';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { GroupsIcon } from '../../components/ui/GroupsIcon';
import { usePendingCompanyChangeBadge } from '../../features/company-profile/hooks/useCompanyProfileData';
import { usePendingFeedbackCount } from '../../features/meetings/hooks/useMeetingData';

// Comprehensive Icon mapping dictionary
const ICON_MAP: Record<string, LucideIcon> = {
  PhoneCall,
  TicketPercent,
  CheckCircle2,
  CalendarClock,
  Briefcase,
  Presentation,
  MapPin,
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
  ShoppingCart,
  Truck,
  Store,
  LifeBuoy,
  Contact,
  Star,
  FileText,
  LayoutDashboard,
  Building2,
  Wallet,
  BookOpen,
  ScanBarcode,
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

  useAccessSync();
  const { authorizedNavigation, designationLabel, level, can } = useAccess();
  // Dealer logins see only their own portal: no admin level, no management modules
  const isDealer = can('DEALER_PORTAL_VIEW');
  // Only the modules the user's permissions open
  const authorizedItems = useMemo(() => authorizedNavigation(), [authorizedNavigation]);
  // Header items (My Meetings) sit in the top bar beside the bell; the rest fill the sidebar
  const visibleNavItems = useMemo(() => authorizedItems.filter((item) => item.placement !== 'header'), [authorizedItems]);
  const myMeetingsNav = authorizedItems.find((item) => item.id === 'my-meetings');
  const levelLabel = level === 'ADMIN_L2' ? 'Level 2' : level === 'ADMIN_L1' ? 'Level 1' : isDealer ? null : level;

  // "1" next to Company Profile while a change waits for approval.
  const hasCompanyProfileNav = visibleNavItems.some((item) => item.id === 'company-profile');
  const companyChangePending = usePendingCompanyChangeBadge(hasCompanyProfileNav);
  // Meetings waiting for my feedback, on the My Meetings icon (one count when the app opens, and after feedback is given)
  const meetingFeedbackPending = usePendingFeedbackCount(Boolean(myMeetingsNav));
  const meetingsWord = meetingFeedbackPending === 1 ? 'meeting waits' : 'meetings wait';
  const myMeetingsLabel = meetingFeedbackPending > 0
    ? `My Meetings: ${meetingFeedbackPending} ${meetingsWord} for your feedback`
    : 'My Meetings';

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
              {[designationLabel, levelLabel].filter(Boolean).join(' · ') || 'Admin'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell Icon */}
          <NotificationBell />

          {/* My Meetings Icon */}
          {myMeetingsNav && (
            <NavLink
              to={myMeetingsNav.path}
              title={myMeetingsNav.label}
              aria-label={myMeetingsLabel}
              className={({ isActive }) =>
                `p-2.5 rounded-full transition-colors cursor-pointer relative ${
                  isActive ? 'bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-400' : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300'
                }`
              }
            >
              <GroupsIcon className="w-5 h-5" />
              {meetingFeedbackPending > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-white dark:border-black">
                  {meetingFeedbackPending > 99 ? '99+' : meetingFeedbackPending}
                </span>
              )}
            </NavLink>
          )}

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
          {/* Capped to the window so the module list scrolls with the mouse wheel instead of running off-screen */}
          <div className="bg-white dark:bg-[#161617] rounded-2xl p-3 sticky top-20 max-h-[calc(100dvh-6rem)] flex flex-col border border-black/10 dark:border-white/10 shadow-sm transition-colors duration-200">
            <p className="shrink-0 px-3 py-2 text-[11px] font-bold tracking-wider text-gray-400 dark:text-neutral-500 uppercase select-none">
              {isDealer ? 'Dealer Portal' : 'Management Modules'}
            </p>

            <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1 pt-1 -mx-1 px-1">

            {visibleNavItems.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-neutral-400">
                {designationLabel
                  ? 'Your designation has no modules yet.'
                  : 'No designation is assigned to your account. Ask an administrator to assign one in Employee Management.'}
              </p>
            )}
            {visibleNavItems.map((item) => {
              const Icon = ICON_MAP[item.iconName] || HelpCircle;
              return (
                // The User Guide is last in APP_NAVIGATION; a divider sets it apart from the modules
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `${item.id === 'user-guide' ? 'mt-2 relative before:absolute before:-top-1.5 before:left-3 before:right-3 before:border-t before:border-black/10 dark:before:border-white/10 ' : ''}group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
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
                      {item.id === 'company-profile' && companyChangePending && (
                        <span
                          className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center"
                          aria-label="1 change waiting for approval"
                        >
                          1
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <Suspense
            fallback={
              <div className="min-h-[300px] flex items-center justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};