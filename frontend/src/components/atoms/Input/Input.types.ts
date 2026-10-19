import type { ReactNode } from 'react';

export interface InputProps {
  label: string;
  type: 'text' | 'email' | 'password' | 'date';
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rightIcon?: ReactNode;
  shake?: boolean;
  inputMode?: 'text' | 'numeric';
}
