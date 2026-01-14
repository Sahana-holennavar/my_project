"use client";

import React, { useRef } from 'react';

type Props = {
  length: number;
  value: string;
  onChange: (val: string) => void;
  inputClassName?: string;
};

const OTPInput: React.FC<Props> = ({ length, value, onChange, inputClassName }) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/\D/g, ''); // Only digits
    if (!val) return;
    const newValue = value.split('');
    newValue[idx] = val[val.length - 1];
    for (let i = 1; i < val.length; i++) {
      if (idx + i < length) newValue[idx + i] = val[i];
    }
    const joined = newValue.join('').slice(0, length);
    onChange(joined);
    // Move focus only if not all boxes are filled
    if (val.length > 0 && idx < length - 1 && joined.length < length) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
    const newValue = value.split('');
    newValue[idx] = '';
    onChange(newValue.join(''));
      } else if (idx > 0) {
        inputsRef.current[idx - 1]?.focus();
  const newValue = value.split('');
  newValue[idx - 1] = '';
  onChange(newValue.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      setTimeout(() => {
        if (inputsRef.current[pasted.length - 1]) {
          inputsRef.current[pasted.length - 1]?.focus();
        }
      }, 0);
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center mb-2 max-w-xs w-full mx-auto flex-wrap">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputsRef.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          className={inputClassName + ' w-12'}
          autoFocus={idx === 0}
        />
      ))}
    </div>
  );
};

export default OTPInput;
