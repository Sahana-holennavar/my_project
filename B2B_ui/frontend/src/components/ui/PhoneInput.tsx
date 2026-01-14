'use client'

import React, { useState, useEffect } from 'react'
import PhoneInputWithCountry, { type Country, type Value } from 'react-phone-number-input'
import { detectCountryCode, normalizeCountryCode } from '@/lib/utils/countryDetection'
import { Loader2 } from 'lucide-react'
import './phone-input.css'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string | undefined) => void
  onBlur?: () => void
  error?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  className?: string
  id?: string
  name?: string
}

/**
 * PhoneInput Component with Auto Country Code Detection
 * 
 * Features:
 * - Auto-detects country code on mount
 * - Allows manual country selection
 * - Formats phone number as user types
 * - Validates using libphonenumber-js
 * - Fallback to +91 (India) if detection fails
 */
export function PhoneInput({
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  placeholder,
  className = '',
  id,
  name,
}: PhoneInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<Country | undefined>(undefined)
  const [isDetecting, setIsDetecting] = useState(true)

  // Auto-detect country code on mount
  useEffect(() => {
    let isMounted = true

    const detectCountry = async () => {
      setIsDetecting(true)
      try {
        const countryCode = await detectCountryCode()
        const normalizedCode = normalizeCountryCode(countryCode)
        
        if (isMounted) {
          setDefaultCountry(normalizedCode as Country)
          setIsDetecting(false)
        }
      } catch (error) {
        console.error('Country detection failed:', error)
        // Fallback to India
        if (isMounted) {
          setDefaultCountry('IN' as Country)
          setIsDetecting(false)
        }
      }
    }

    detectCountry()

    return () => {
      isMounted = false
    }
  }, [])

  // Custom styles to match the app's design system
  const customStyles = {
    '--PhoneInputCountryFlag-borderColor': 'rgb(229 231 235)',
    '--PhoneInputCountryFlag-borderColor--focus': 'rgb(147 51 234)',
    '--PhoneInput-color--focus': 'rgb(147 51 234)',
  } as React.CSSProperties

  return (
    <div className={`relative ${className}`}>
      {isDetecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-800/50 rounded-lg z-10">
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
        </div>
      )}
      <PhoneInputWithCountry
        international
        defaultCountry={defaultCountry}
        value={value as Value | undefined}
        onChange={(val) => {
          if (onChange) {
            onChange(val || undefined)
          }
        }}
        onBlur={onBlur}
        disabled={disabled || isDetecting}
        required={required}
        placeholder={placeholder || 'Enter phone number'}
        id={id}
        name={name}
        className={`
          phone-input-custom
          w-full px-4 py-2 rounded-xl border
          ${error 
            ? 'border-red-500 dark:border-red-500' 
            : 'border-neutral-300 dark:border-neutral-700'
          }
          bg-white dark:bg-neutral-800 
          text-neutral-900 dark:text-white
          focus:ring-2 focus:ring-purple-500 focus:border-transparent
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={customStyles}
      />
      {error && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}

