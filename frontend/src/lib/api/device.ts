import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface DeviceRegisterRequest {
  serialNumber: string;
  modelName: string;
  firmwareVersion?: string;
}

export interface DeviceResponse {
  deviceId: number;
  serialNumber: string;
  modelName: string;
  firmwareVersion: string;
  registeredAt: string;
  lastConnectedAt: string | null;
}

export interface DeviceStatusResponse {
  deviceId: number;
  serialNumber: string;
  modelName: string;
  firmwareVersion: string;
  lastConnectedAt: string | null;
  connected: boolean;
}

export const DEVICE_SERIAL = process.env.NEXT_PUBLIC_DEVICE_SERIAL ?? 'ESP32S3-HABITOOTH-01';
export const DEVICE_MODEL = 'HabiTooth-Scanner-V1';
export const DEVICE_FIRMWARE = '1.0.0';

export const deviceApi = {
  register: (params?: Partial<DeviceRegisterRequest>) =>
    apiClient.post<ApiResponse<DeviceResponse>>('/api/device', {
      serialNumber: params?.serialNumber ?? DEVICE_SERIAL,
      modelName: params?.modelName ?? DEVICE_MODEL,
      firmwareVersion: params?.firmwareVersion ?? DEVICE_FIRMWARE,
    }),

  getStatus: () => apiClient.get<ApiResponse<DeviceStatusResponse[]>>('/api/device/status'),
};
