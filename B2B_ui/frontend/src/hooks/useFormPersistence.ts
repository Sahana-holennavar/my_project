import { useEffect, useCallback } from 'react';

interface FormData {
  phone?: string;
  email?: string;
  full_name?: string;
  address?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

export function useFormPersistence(formKey: string, formData: FormData) {
  const storageKey = `job_application_${formKey}`;

  const saveFormData = useCallback(() => {
    try {
      const dataToSave = {
        phone: formData.phone || '',
        email: formData.email || '',
        full_name: formData.full_name || '',
        address: formData.address || '',
        portfolioUrl: formData.portfolioUrl || '',
        linkedinUrl: formData.linkedinUrl || '',
        githubUrl: formData.githubUrl || '',
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }, [formData, storageKey]);

  const loadFormData = useCallback((): FormData | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedDate = new Date(parsed.savedAt);
        const now = new Date();
        const daysDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 7) {
          localStorage.removeItem(storageKey);
          return null;
        }
        return {
          phone: parsed.phone || '',
          email: parsed.email || '',
          full_name: parsed.full_name || '',
          address: parsed.address || '',
          portfolioUrl: parsed.portfolioUrl || '',
          linkedinUrl: parsed.linkedinUrl || '',
          githubUrl: parsed.githubUrl || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load form data:', error);
      return null;
    }
  }, [storageKey]);

  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear form data:', error);
    }
  }, [storageKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveFormData();
    }, 30000);

    return () => clearInterval(interval);
  }, [saveFormData]);

  return {
    saveFormData,
    loadFormData,
    clearFormData,
  };
}

