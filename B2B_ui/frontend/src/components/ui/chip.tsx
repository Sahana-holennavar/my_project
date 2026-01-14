import React from 'react';

interface ChipProps {
  children: React.ReactNode;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 text-sm text-gray-200 border border-gray-700 ${className}`}>
    {children}
  </span>
);
