'use client';

import type { SignalBarsProps, SignalLevel } from './SignalBars.types';

export type { SignalLevel, SignalBarsProps } from './SignalBars.types';

const COLORS: Record<SignalLevel, [string, string, string, string]> = {
  strong: ['#4BC8A0', '#4BC8A0', '#4BC8A0', '#4BC8A0'],
  medium: ['#FFB347', '#FFB347', '#FFB347', '#E5EDF5'],
  weak:   ['#FF6B8A', '#FF6B8A', '#E5EDF5', '#E5EDF5'],
};

export const SIGNAL_LABEL: Record<SignalLevel, string> = {
  strong: '강함', medium: '보통', weak: '약함',
};

export default function SignalBars({ level }: SignalBarsProps) {
  const [c0, c1, c2, c3] = COLORS[level];
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
      <rect x="0"  y="9" width="3" height="4"  rx="1" fill={c0} />
      <rect x="5"  y="6" width="3" height="7"  rx="1" fill={c1} />
      <rect x="10" y="3" width="3" height="10" rx="1" fill={c2} />
      <rect x="15" y="0" width="3" height="13" rx="1" fill={c3} />
    </svg>
  );
}
