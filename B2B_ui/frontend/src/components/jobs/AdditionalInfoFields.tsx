'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdditionalInfoFieldsProps {
  values: {
    portfolioUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
  };
  onChange: (values: {
    portfolioUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
  }) => void;
}

function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function AdditionalInfoFields({ values, onChange }: AdditionalInfoFieldsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [errors, setErrors] = useState<{
    portfolioUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
  }>({});

  const handleChange = (field: 'portfolioUrl' | 'linkedinUrl' | 'githubUrl', value: string) => {
    const newValues = { ...values, [field]: value };
    onChange(newValues);

    if (value && !validateUrl(value)) {
      setErrors((prev) => ({ ...prev, [field]: 'Please enter a valid URL' }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Additional Information
          </Label>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">(Optional)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
          <div className="space-y-2">
            <Label htmlFor="portfolioUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Portfolio URL
            </Label>
            <Input
              id="portfolioUrl"
              type="url"
              placeholder="https://yourportfolio.com"
              value={values.portfolioUrl || ''}
              onChange={(e) => handleChange('portfolioUrl', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && !validateUrl(e.target.value)) {
                  setErrors((prev) => ({ ...prev, portfolioUrl: 'Please enter a valid URL' }));
                }
              }}
              className={errors.portfolioUrl ? 'border-red-500' : ''}
            />
            {errors.portfolioUrl && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.portfolioUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              LinkedIn URL
            </Label>
            <Input
              id="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={values.linkedinUrl || ''}
              onChange={(e) => handleChange('linkedinUrl', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && !validateUrl(e.target.value)) {
                  setErrors((prev) => ({ ...prev, linkedinUrl: 'Please enter a valid URL' }));
                }
              }}
              className={errors.linkedinUrl ? 'border-red-500' : ''}
            />
            {errors.linkedinUrl && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.linkedinUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              GitHub URL
            </Label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/yourusername"
              value={values.githubUrl || ''}
              onChange={(e) => handleChange('githubUrl', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && !validateUrl(e.target.value)) {
                  setErrors((prev) => ({ ...prev, githubUrl: 'Please enter a valid URL' }));
                }
              }}
              className={errors.githubUrl ? 'border-red-500' : ''}
            />
            {errors.githubUrl && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.githubUrl}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

