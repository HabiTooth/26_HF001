'use client';

import { useState } from 'react';
import type { InputProps } from './Input.types';

export type { InputProps } from './Input.types';

export default function Input({ label, type, placeholder, value, onChange, error, rightIcon, shake, inputMode }: InputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || !!value;

  const fieldClass = [
    'float-field',
    active ? 'active' : '',
    focused ? 'focused' : '',
    shake || error ? 'shake' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <div className={fieldClass}>
        <label className="float-label">{label}</label>
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="float-input"
        />
        {rightIcon && (
          <span className="flex items-center text-muted ml-2 flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="m-0 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
