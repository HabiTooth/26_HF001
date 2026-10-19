import type { AppNotification } from './types';

export type PermissionState = NotificationPermission | 'unsupported';

export function permissionState(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<PermissionState> {
  if (permissionState() === 'unsupported') return 'unsupported';
  return Notification.requestPermission();
}

export function showLocal(n: Pick<AppNotification, 'title' | 'body' | 'link'>) {
  if (permissionState() !== 'granted') return;
  const notification = new Notification(n.title, {
    body: n.body,
    icon: '/HabiTooth_logo.png',
  });
  if (n.link) {
    notification.onclick = () => {
      window.focus();
      window.location.href = n.link!;
    };
  }
}
