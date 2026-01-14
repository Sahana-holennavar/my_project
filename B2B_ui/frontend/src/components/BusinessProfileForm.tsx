"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Plus, Trash2 } from "lucide-react";

interface BusinessProfileFormProps {
  onSubmit: (data: BusinessProfileFormData) => void;
  loading?: boolean;
  initialData?: Partial<BusinessProfileFormData>;
}

export interface BusinessProfileFormData {
  companyName: string;
  company_logo?: {
    fileId: string;
    fileUrl: string;
    filename: string;
    uploadedAt: string;
  };
  company_type: string;
  company_website?: string;
  tagline?: string;
  industry: string;
  company_size: string;
  headquater_location?: string;
  location?: string;
  primary_email: string;
  additional_email?: {
    email: string;
  }[];
  phone_number?: string;
  additional_phone_numbers?: {
    phone_number: string;
  }[];
  privacy_settings: {
    profile_visibility: "public" | "private";
    contact_visibility: "public" | "private";
  };
}

export const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  onSubmit,
  loading = false,
  initialData = {},
}) => {
  const [formData, setFormData] = useState<BusinessProfileFormData>({
    companyName: initialData.companyName || "",
    company_type: initialData.company_type || "",
    company_website: initialData.company_website || "",
    tagline: initialData.tagline || "",
    industry: initialData.industry || "",
    company_size: initialData.company_size || "0",
    headquater_location: initialData.headquater_location || "",
    location: initialData.location || "",
    primary_email: initialData.primary_email || "",
    additional_email: initialData.additional_email || [],
    phone_number: initialData.phone_number || "",
    additional_phone_numbers: initialData.additional_phone_numbers || [],
    privacy_settings: {
      profile_visibility: initialData.privacy_settings?.profile_visibility || "public",
      contact_visibility: initialData.privacy_settings?.contact_visibility || "private",
    },
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData.company_logo?.fileUrl || null
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateCompanyName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "Company name is required";
    if (trimmed.length < 3) return "Company name must be at least 3 characters";
    if (trimmed.length > 100) return "Company name cannot exceed 100 characters";
    if (!/^[A-Za-z0-9&\-\.\s]+$/.test(trimmed)) {
      return "Company name may only include letters, numbers, spaces, &, -, .";
    }
    return null;
  };

  const validateCompanyType = (type: string): string | null => {
    const validTypes = ["Private", "Public", "Partnership", "Sole Proprietorship", "Non-Profit", "Other"];
    if (!type.trim()) return "Company type must be selected from the provided options";
    if (!validTypes.includes(type)) return "Company type must be selected from the provided options";
    return null;
  };

  const validateTagline = (tagline: string): string | null => {
    if (tagline && tagline.length > 150) return "Tagline cannot exceed 150 characters";
    return null;
  };

  const validateCompanySize = (size: string): string | null => {
    if (!size.trim()) return "Company size must be between 1 and 100";
    const numSize = parseInt(size);
    if (isNaN(numSize)) return "Company size must be a valid number";
    if (numSize < 1 || numSize > 100) return "Company size must be between 1 and 100";
    return null;
  };

  const validateHeadquarterLocation = (location: string): string | null => {
    const trimmed = location.trim();
    if (!trimmed) return "Headquarter location must be between 5 and 500 characters";
    if (trimmed.length < 5) return "Headquarter location must be at least 5 characters";
    if (trimmed.length > 500) return "Headquarter location cannot exceed 500 characters";
    return null;
  };

  const validateLocation = (location: string): string | null => {
    if (location && location.trim()) {
      const trimmed = location.trim();
      if (trimmed.length < 2) return "Location must be at least 2 characters when provided";
      if (trimmed.length > 500) return "Location cannot exceed 500 characters";
    }
    return null;
  };

  const validateWebsite = (website: string): string | null => {
    if (website && website.trim()) {
      const trimmed = website.trim();
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return "Website must be a valid URL starting with http:// or https://";
      }
      try {
        new URL(trimmed);
      } catch {
        return "Website must be a valid URL starting with http:// or https://";
      }
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return "Primary email must be a valid email address";
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email.trim())) return "Primary email must be a valid email address";
    return null;
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone.trim()) return "Primary phone number must be in international E.164 format";
    // E.164 format: starts with + followed by country code and number (max 15 digits total)
    const phonePattern = /^\+[1-9]\d{1,14}$/;
    if (!phonePattern.test(phone.trim())) {
      return "Primary phone number must be in international E.164 format (e.g., +1234567890)";
    }
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all fields
    const companyNameError = validateCompanyName(formData.companyName);
    if (companyNameError) newErrors.companyName = companyNameError;

    const companyTypeError = validateCompanyType(formData.company_type);
    if (companyTypeError) newErrors.company_type = companyTypeError;

    const taglineError = validateTagline(formData.tagline || '');
    if (taglineError) newErrors.tagline = taglineError;

    const companySizeError = validateCompanySize(formData.company_size);
    if (companySizeError) newErrors.company_size = companySizeError;

    const headquarterLocationError = validateHeadquarterLocation(formData.headquater_location || '');
    if (headquarterLocationError) newErrors.headquater_location = headquarterLocationError;

    const locationError = validateLocation(formData.location || '');
    if (locationError) newErrors.location = locationError;

    const websiteError = validateWebsite(formData.company_website || '');
    if (websiteError) newErrors.company_website = websiteError;

    const emailError = validateEmail(formData.primary_email);
    if (emailError) newErrors.primary_email = emailError;

    const phoneError = validatePhone(formData.phone_number || '');
    if (phoneError) newErrors.phone_number = phoneError;

    // Validate additional emails
    formData.additional_email?.forEach((emailObj, index) => {
      if (emailObj.email.trim()) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(emailObj.email.trim())) {
          newErrors[`additional_email_${index}`] = "Please enter a valid email address";
        }
      }
    });

    // Validate additional phone numbers
    formData.additional_phone_numbers?.forEach((phoneObj, index) => {
      if (phoneObj.phone_number.trim()) {
        const phonePattern = /^\+[1-9]\d{1,14}$/;
        if (!phonePattern.test(phoneObj.phone_number.trim())) {
          newErrors[`additional_phone_${index}`] = "Phone number must be in international E.164 format";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Real-time validation function
  const validateField = (field: keyof BusinessProfileFormData, value: string) => {
    let error: string | null = null;

    switch (field) {
      case 'companyName':
        error = validateCompanyName(value);
        break;
      case 'company_type':
        error = validateCompanyType(value);
        break;
      case 'tagline':
        error = validateTagline(value);
        break;
      case 'company_size':
        error = validateCompanySize(value);
        break;
      case 'headquater_location':
        error = validateHeadquarterLocation(value);
        break;
      case 'location':
        error = validateLocation(value);
        break;
      case 'company_website':
        error = validateWebsite(value);
        break;
      case 'primary_email':
        error = validateEmail(value);
        break;
      case 'phone_number':
        error = validatePhone(value);
        break;
    }

    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleInputChange = (
    field: keyof BusinessProfileFormData,
    value: string
  ) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Real-time validation
    validateField(field, value);
  };

  const handlePrivacyChange = (
    field: "profile_visibility" | "contact_visibility",
    value: "public" | "private"
  ) => {
    setFormData(prev => ({
      ...prev,
      privacy_settings: {
        ...prev.privacy_settings,
        [field]: value,
      },
    }));
  };

  const addAdditionalEmail = () => {
    setFormData(prev => ({
      ...prev,
      additional_email: [...(prev.additional_email || []), { email: "" }],
    }));
  };

  const removeAdditionalEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additional_email: prev.additional_email?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateAdditionalEmail = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      additional_email: prev.additional_email?.map((item, i) => 
        i === index ? { email } : item
      ) || [],
    }));

    // Real-time validation for additional email
    if (email.trim()) {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(email.trim())) {
        setErrors(prev => ({ ...prev, [`additional_email_${index}`]: "Please enter a valid email address" }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`additional_email_${index}`];
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`additional_email_${index}`];
        return newErrors;
      });
    }
  };

  const addAdditionalPhone = () => {
    setFormData(prev => ({
      ...prev,
      additional_phone_numbers: [...(prev.additional_phone_numbers || []), { phone_number: "" }],
    }));
  };

  const removeAdditionalPhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additional_phone_numbers: prev.additional_phone_numbers?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateAdditionalPhone = (index: number, phone_number: string) => {
    setFormData(prev => ({
      ...prev,
      additional_phone_numbers: prev.additional_phone_numbers?.map((item, i) => 
        i === index ? { phone_number } : item
      ) || [],
    }));

    // Real-time validation for additional phone
    if (phone_number.trim()) {
      const phonePattern = /^\+[1-9]\d{1,14}$/;
      if (!phonePattern.test(phone_number.trim())) {
        setErrors(prev => ({ ...prev, [`additional_phone_${index}`]: "Phone number must be in international E.164 format" }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`additional_phone_${index}`];
          return newErrors;
        });
      }
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`additional_phone_${index}`];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: BusinessProfileFormData = {
      ...formData,
      // Note: Logo upload would need to be handled separately in real implementation
      // For now, we'll include the existing logo or placeholder data
      company_logo: logoFile ? {
        fileId: `temp-${Date.now()}`,
        fileUrl: logoPreview || "",
        filename: logoFile.name,
        uploadedAt: new Date().toISOString(),
      } : formData.company_logo,
    };

    onSubmit(submitData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.companyName ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* Company Type */}
            <div>
              <label htmlFor="company_type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Company Type <span className="text-red-500">*</span>
              </label>
              <select
                id="company_type"
                value={formData.company_type}
                onChange={(e) => handleInputChange("company_type", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.company_type ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
              >
                <option value="">Select company type</option>
                <option value="Private">Private</option>
                <option value="Public">Public</option>
                <option value="Partnership">Partnership</option>
                <option value="Sole Proprietorship">Sole Proprietorship</option>
                <option value="Non-Profit">Non-Profit</option>
                <option value="Other">Other</option>
              </select>
              {errors.company_type && (
                <p className="text-red-500 text-sm mt-1">{errors.company_type}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Industry <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="industry"
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.industry ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
                placeholder="e.g., Technology, Healthcare, Finance"
              />
              {errors.industry && (
                <p className="text-red-500 text-sm mt-1">{errors.industry}</p>
              )}
            </div>

            {/* Company Size */}
            <div>
              <label htmlFor="company_size" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Company Size (Number of Employees) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="company_size"
                min="1"
                max="100"
                value={formData.company_size}
                onChange={(e) => handleInputChange("company_size", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.company_size ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
                placeholder="Enter number of employees (1-100)"
              />
              {errors.company_size && (
                <p className="text-red-500 text-sm mt-1">{errors.company_size}</p>
              )}
            </div>
          </div>

          {/* Company Website */}
          <div className="mt-4">
            <label htmlFor="company_website" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Company Website
            </label>
            <input
              type="url"
              id="company_website"
              value={formData.company_website}
              onChange={(e) => handleInputChange("company_website", e.target.value)}
              className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                errors.company_website ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
              }`}
              placeholder="https://www.company.com"
            />
            {errors.company_website && (
              <p className="text-red-500 text-sm mt-1">{errors.company_website}</p>
            )}
          </div>

          {/* Tagline */}
          <div className="mt-4">
            <label htmlFor="tagline" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Tagline
            </label>
            <input
              type="text"
              id="tagline"
              value={formData.tagline}
              onChange={(e) => handleInputChange("tagline", e.target.value)}
              className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                errors.tagline ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
              }`}
              placeholder="Brief company slogan or motto"
              maxLength={150}
            />
            {errors.tagline && (
              <p className="text-red-500 text-sm mt-1">{errors.tagline}</p>
            )}
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Contact Information
          </h3>
          
          {/* Primary Email */}
          <div className="mb-4">
            <label htmlFor="primary_email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Primary Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="primary_email"
              value={formData.primary_email}
              onChange={(e) => handleInputChange("primary_email", e.target.value)}
              className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                errors.primary_email ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
              }`}
              placeholder="business@company.com"
            />
            {errors.primary_email && (
              <p className="text-red-500 text-sm mt-1">{errors.primary_email}</p>
            )}
          </div>

          {/* Additional Emails */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Additional Emails
              </label>
              <button
                type="button"
                onClick={addAdditionalEmail}
                className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Email
              </button>
            </div>
            {formData.additional_email?.map((emailObj, index) => (
              <div key={index} className="mb-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailObj.email}
                    onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                    className={`flex-1 p-2 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                      errors[`additional_email_${index}`] ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="additional@company.com"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalEmail(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {errors[`additional_email_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`additional_email_${index}`]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Phone Number */}
          <div className="mb-4">
            <label htmlFor="phone_number" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => handleInputChange("phone_number", e.target.value)}
              className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                errors.phone_number ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
              }`}
              placeholder="+1234567890"
            />
            {errors.phone_number && (
              <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
            )}
          </div>

          {/* Additional Phone Numbers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Additional Phone Numbers
              </label>
              <button
                type="button"
                onClick={addAdditionalPhone}
                className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Phone
              </button>
            </div>
            {formData.additional_phone_numbers?.map((phoneObj, index) => (
              <div key={index} className="mb-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneObj.phone_number}
                    onChange={(e) => updateAdditionalPhone(index, e.target.value)}
                    className={`flex-1 p-2 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                      errors[`additional_phone_${index}`] ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                    }`}
                    placeholder="+1234567890"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalPhone(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {errors[`additional_phone_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`additional_phone_${index}`]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Location Information Section */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Location Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Headquarters Location */}
            <div>
              <label htmlFor="headquater_location" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Headquarters Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="headquater_location"
                value={formData.headquater_location}
                onChange={(e) => handleInputChange("headquater_location", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.headquater_location ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
                placeholder="City, State, Country"
              />
              {errors.headquater_location && (
                <p className="text-red-500 text-sm mt-1">{errors.headquater_location}</p>
              )}
            </div>

            {/* Primary Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Primary Operating Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className={`w-full p-3 border rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ${
                  errors.location ? "border-red-500" : "border-neutral-300 dark:border-neutral-600"
                }`}
                placeholder="City, State, Country"
              />
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Privacy Settings
          </h3>
          
          <div className="space-y-4">
            {/* Profile Visibility */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Profile Visibility
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value="public"
                    checked={formData.privacy_settings.profile_visibility === "public"}
                    onChange={(e) =>
                      handlePrivacyChange("profile_visibility", e.target.value as "public" | "private")
                    }
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Public</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value="private"
                    checked={formData.privacy_settings.profile_visibility === "private"}
                    onChange={(e) =>
                      handlePrivacyChange("profile_visibility", e.target.value as "public" | "private")
                    }
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Private</span>
                </label>
              </div>
            </div>

            {/* Contact Visibility */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Contact Visibility
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contact_visibility"
                    value="public"
                    checked={formData.privacy_settings.contact_visibility === "public"}
                    onChange={(e) =>
                      handlePrivacyChange("contact_visibility", e.target.value as "public" | "private")
                    }
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Public</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contact_visibility"
                    value="private"
                    checked={formData.privacy_settings.contact_visibility === "private"}
                    onChange={(e) =>
                      handlePrivacyChange("contact_visibility", e.target.value as "public" | "private")
                    }
                    className="mr-2 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Private</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Business Profile"
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};