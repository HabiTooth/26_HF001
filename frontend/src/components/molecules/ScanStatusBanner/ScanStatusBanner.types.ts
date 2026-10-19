export type ScanStatusType = 'good' | 'far' | 'close' | 'shaking' | 'dark' | 'complete';

export interface ScanStatusBannerProps {
  status: ScanStatusType;
}
