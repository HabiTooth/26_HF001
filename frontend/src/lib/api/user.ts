import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { DeviceStatusResponse } from './device';

export interface Profile {
  userId: number;
  email: string;
  name: string;
  birthDate: string | null;
  lastDentalVisitAt: string | null;
}

export interface ProfileUpdatePayload {
  name: string;
  birthDate?: string;
  lastDentalVisitAt?: string;
}

export interface NotificationSetting {
  pushNotificationEnabled: boolean;
  reportNotificationEnabled: boolean;
}

export interface ToothProfile {
  isSet: boolean;
  missingTeeth: number[];
}

export const userApi = {
  getProfile: () => apiClient.get<ApiResponse<Profile>>('/api/user/profile'),

  updateProfile: (payload: ProfileUpdatePayload) =>
    apiClient.patch<ApiResponse<Profile>>('/api/user/profile', payload),

  getDeviceStatus: () => apiClient.get<ApiResponse<DeviceStatusResponse[]>>('/api/user/status'),

  getNotification: () => apiClient.get<ApiResponse<NotificationSetting>>('/api/user/notification'),

  updateNotification: (payload: NotificationSetting) =>
    apiClient.patch<ApiResponse<NotificationSetting>>('/api/user/notification', payload),

  getToothProfile: () => apiClient.get<ApiResponse<ToothProfile>>('/api/user/tooth-profile'),

  updateToothProfile: (missingTeeth: number[]) =>
    apiClient.put<ApiResponse<null>>('/api/user/tooth-profile', { missingTeeth }),

  deleteData: () => apiClient.delete<ApiResponse<null>>('/api/user/data'),
};
