import { axiosClient } from '../axiosClient';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  read: boolean;
  broadcast: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  errorCode: string;
  data: {
    unreadCount: number;
  };
  timestamp: string;
  path: string;
}

export interface NotificationsListResponse {
  success: boolean;
  message: string;
  errorCode: string;
  data: NotificationItem[];
  timestamp: string;
  path: string;
}

export const notificationService = {
  // Get unread notification count
  getUnreadCount: async (): Promise<number> => {
    const response = await axiosClient.get<UnreadCountResponse>(`/v1/notifications/unread-count`);
    return response.data?.data?.unreadCount ?? 0;
  },

  // Get all notifications
  getAllNotifications: async (): Promise<NotificationItem[]> => {
    const response = await axiosClient.get<NotificationsListResponse>(`/v1/notifications`);
    return response.data?.data ?? [];
  },

  // Mark notification as read
  markAsRead: async (notificationId: number): Promise<void> => {
    await axiosClient.patch(`/v1/notifications/${notificationId}/read`);
  },
};