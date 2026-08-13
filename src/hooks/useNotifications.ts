import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../api/services/notificationService';
import type { NotificationItem } from '../api/services/notificationService';

export const useNotifications = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to guarantee the initial unread count API call only runs ONCE
  const hasFetchedRef = useRef<boolean>(false);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
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
    setError(null);
    try {
      const data = await notificationService.getAllNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications.');
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  return {
    unreadCount,
    notifications,
    isLoading,
    error,
    fetchUnreadCount,
    fetchAllNotifications,
    markAsRead,
  };
};