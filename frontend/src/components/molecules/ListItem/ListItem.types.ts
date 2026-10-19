import type { ReactNode } from 'react';

export interface ListItemProps {
  left?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}
