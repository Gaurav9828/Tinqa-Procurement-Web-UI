import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationItem } from '../../api/services/notificationService';

export const NotificationBell: React.FC = () => {
  const {
    unreadCount,
    notifications,
    isLoading,
    error,
    fetchAllNotifications,
    markAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle opening/closing popover
  const handleTogglePopover = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    // Fetch full notification list when opening popover
    if (nextState) {
      fetchAllNotifications();
    }
  };

  // Expand notification message & mark as read if unread
  const handleNotificationClick = async (item: NotificationItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(item.id);

    if (!item.read) {
      await markAsRead(item.id);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleTogglePopover}
        className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer relative"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700 dark:text-gray-300" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-white dark:border-black animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-[#0071e3] dark:text-blue-400">
                  {unreadCount} new
                </span>
              )}
            </h3>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="py-8 text-center text-xs text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 dark:text-neutral-500">
                No notifications found
              </div>
            ) : (
              notifications.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors duration-150 ${
                      !item.read
                        ? 'bg-blue-50/50 dark:bg-blue-950/20'
                        : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !item.read ? 'bg-[#0071e3]' : 'bg-transparent'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs tracking-tight ${
                              !item.read
                                ? 'font-semibold text-gray-900 dark:text-white'
                                : 'font-normal text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-neutral-500 block mt-0.5">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleNotificationClick(item)}
                        className="flex items-center gap-1 text-[11px] font-medium text-[#0071e3] hover:underline shrink-0 pt-0.5 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Hide <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            View <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 ml-4 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed animate-in fade-in duration-150">
                        {item.message}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};