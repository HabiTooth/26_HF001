export type NotificationType =
  | 'REPORT_READY'
  | 'SCAN_REMINDER'
  | 'RISK_ALERT'
  | 'STREAK'
  | 'CHECKUP';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  read: boolean;
}
