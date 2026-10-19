'use client';

import { Check } from 'lucide-react';
import type { CheckboxProps } from './Checkbox.types';

export type { CheckboxProps } from './Checkbox.types';

export default function Checkbox({ label, checked, onChange, bold }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
    >
      <span
        className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
          checked ? 'bg-primary border-primary' : 'bg-white border-hairline'
        }`}
      >
        <span className={`transition-transform duration-150 ${checked ? 'scale-100' : 'scale-0'}`}>
          <Check size={11} color="white" strokeWidth={2.5} />
        </span>
      </span>
      <span className={`text-[14px] text-content leading-snug ${bold ? 'font-semibold' : 'font-normal'}`}>
        {label}
      </span>
    </button>
  );
}
