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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const notificationService = {
  // Get unread notification count
  getUnreadCount: async (): Promise<number> => {
    const response = await axiosClient.get<UnreadCountResponse>(`${API_BASE_URL}/v1/notifications/unread-count`);
    return response.data?.data?.unreadCount ?? 0;
  },

  // Get all notifications
  getAllNotifications: async (): Promise<NotificationItem[]> => {
    const response = await axiosClient.get<NotificationsListResponse>(`${API_BASE_URL}/v1/notifications`);
    return response.data?.data ?? [];
  },

  // Mark notification as read
  markAsRead: async (notificationId: number): Promise<void> => {
    await axiosClient.patch(`${API_BASE_URL}/v1/notifications/${notificationId}/read`);
  },
};