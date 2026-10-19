import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { AppNotification } from '@/lib/notifications/types';

export const notificationApi = {
  getAll: () => apiClient.get<ApiResponse<AppNotification[]>>('/api/notifications'),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ count: number }>>('/api/notifications/unread-count'),

  markRead: (id: number) => apiClient.patch<ApiResponse<null>>(`/api/notifications/${id}/read`),

  markAllRead: () => apiClient.patch<ApiResponse<null>>('/api/notifications/read-all'),

  remove: (id: number) => apiClient.delete<ApiResponse<null>>(`/api/notifications/${id}`),

  removeAll: () => apiClient.delete<ApiResponse<null>>('/api/notifications'),
};
