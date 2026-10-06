import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../api/services/notificationService';
import { useNotify } from './useNotify';
import type { NotificationItem } from '../api/services/notificationService';

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const notify = useNotify();

  // Ref to guarantee the initial unread count API call only runs ONCE
  const hasFetchedRef = useRef<boolean>(false);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Badge count is non-critical; keep the last known value.
    }
  }, []);

  // Fetch unread count strictly once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Fetch full list of notifications
  const fetchAllNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getAllNotifications();
      setNotifications(data);
    } catch (err: unknown) {
      notify.error(err, 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  // Mark notification as read and update states reactively
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Optimistically update list state
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item
        )
      );

      // Decrement unread counter safely
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      notify.error(err, 'Failed to mark notification as read.');
    }
  }, [notify]);

  return {
    unreadCount,
    notifications,
    isLoading,
    fetchUnreadCount,
    fetchAllNotifications,
    markAsRead,
  };
};