import { useId, type ReactNode } from 'react';

export default function ReportTooth({
  children,
  color = '#E8F1FE',
  selected = false,
  outlined = false,
  compact = false,
}: {
  children: ReactNode;
  color?: string;
  selected?: boolean;
  outlined?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${compact ? 'h-11 w-9' : 'h-[66px] w-[58px]'} ${selected ? 'drop-shadow-[0_3px_5px_rgba(74,134,217,0.25)]' : ''}`}
    >
      <svg viewBox="0 0 32 36" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={selected ? '#AFD4FF' : '#F5FAFF'} />
            <stop offset="1" stopColor={selected ? '#609FFF' : color} />
          </linearGradient>
        </defs>
        <path
          d="M16 5C11 2 2 2 2 10C2 16 4 21 5 27C6 32 8 34 11 32C13 30 13 28 16 28C19 28 19 30 21 32C24 34 26 32 27 27C28 21 30 16 30 10C30 2 21 2 16 5Z"
          fill={`url(#${id})`}
          stroke={selected ? '#4A86D9' : outlined ? '#D6E1EF' : color}
          strokeWidth={outlined ? 0.9 : 0.6}
          strokeDasharray={outlined ? '2 1.5' : undefined}
        />
      </svg>
      <span
        className={`relative -mt-1 font-bold tabular-nums ${compact ? 'text-[13px]' : 'text-[20px]'} ${selected ? 'text-[#224F92]' : 'text-current'}`}
      >
        {children}
      </span>
    </span>
  );
}
