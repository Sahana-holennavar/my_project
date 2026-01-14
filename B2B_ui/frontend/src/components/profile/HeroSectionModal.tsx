"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  closeHeroModal,
  saveHeroFormDraft,
  createNewProfile,
  updateHero,
  clearHeroFormDraft,
  fetchProfile,
} from "@/store/slices/profileSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { motion, AnimatePresence } from "framer-motion";
import { Save, ArrowRight, Loader2, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { PersonalInformation, About } from "@/lib/api/profile";
import {
  validateName,
  validateEmail,
  validatePhoneSync,
  validateDateOfBirth,
  validateStateProvince,
  validateCountry,
  validateCity,
  validateProfession,
  validateProfessionalSummary,
  validateLinkedInURL,
  validateGitHubURL,
  validateWebsiteURL,
  validateCurrentStatus,
} from "@/lib/validations/profileValidation";

const STEPS = [
  { id: 1, title: "Personal Information", description: "Basic details about you" },
  { id: 2, title: "Professional Details", description: "Your career and industry" },
  { id: 3, title: "Contact & Social Links", description: "How others can reach you" },
];

// Profession options constants
const PROFESSIONAL_PROFESSION_OPTIONS = [
  "IT Industry",
  "Biotechnology",
  "Manufacturing",
  "Industrial Automation",
  "R&D",
  "Human Resource",
  "Construction",
  "Architecture",
  "Interior Design",
  "Design Engineer",
];

const STUDENT_PROFESSION_OPTIONS = [
  "B.Tech / B.E",
  "M.Tech",
  "B.Sc",
  "M.Sc",
  "BCA",
  "MCA",
  "Other",
];

export function HeroSectionModal() {
  const dispatch = useAppDispatch();
  const { showHeroModal, heroFormDraft, updating, error, profile } = useAppSelector(
    (state) => state.profile
  );
  const user = useAppSelector((state) => state.auth.user);

  // Debug: Log user data to verify role
  useEffect(() => {
    if (user) {
      console.log('HeroSectionModal - User data:', {
        id: user.id,
        user_type: user.user_type,
        role: user.role,
        name: user.name
      });
    }
  }, [user]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isDraft, setIsDraft] = useState(false);

  // Field-level error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Touched state to track which fields have been interacted with
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Form state
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInformation>>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    gender: undefined,
    profession: "",
    country: "",
    state_province: "",
    city: "",
    postal_code: "",
  });
  
  // State for custom profession input when "Other" is selected
  const [customProfession, setCustomProfession] = useState("");
  const [isOtherProfessionSelected, setIsOtherProfessionSelected] = useState(false);

  const [about, setAbout] = useState<Partial<About>>({
    professional_summary: "",
    industry: undefined,
    current_status: user?.role === "student" ? "Studying" : "Employed",
    website_url: "",
    linkedin_url: "",
    github_url: "",
  });

  // Determine if this is a new profile or an update
  const isNewProfile = !profile || !profile.personal_information?.first_name;

  const professionOptions = useMemo(
    () => (user?.role === "student" ? STUDENT_PROFESSION_OPTIONS : PROFESSIONAL_PROFESSION_OPTIONS),
    [user?.role]
  );

  const hasBuiltInOtherOption = useMemo(() => professionOptions.includes("Other"), [professionOptions]);

  // Load draft on mount
  useEffect(() => {
    if (heroFormDraft) {
      const draftPersonalInfo = heroFormDraft.personal_information || {
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        date_of_birth: "",
        gender: "",
        profession: "",
        country: "",
        state_province: "",
        city: "",
        postal_code: "",
      };
      setPersonalInfo(draftPersonalInfo);
      // If profession is set and not in the predefined list, it's a custom profession
      if (draftPersonalInfo.profession && !professionOptions.includes(draftPersonalInfo.profession)) {
        setCustomProfession(draftPersonalInfo.profession);
        setIsOtherProfessionSelected(true);
      } else {
        setIsOtherProfessionSelected(false);
      }
      setAbout(heroFormDraft.about || {});
      setIsDraft(true);
      toast.info("Draft loaded", { description: "Your previous progress was restored" });
    } else if (profile) {
      // Load existing profile data
      const profilePersonalInfo = profile.personal_information || {
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        date_of_birth: "",
        gender: "",
        profession: "",
        country: "",
        state_province: "",
        city: "",
        postal_code: "",
      };
      setPersonalInfo(profilePersonalInfo);
      // If profession is set and not in the predefined list, it's a custom profession
      if (profilePersonalInfo.profession && !professionOptions.includes(profilePersonalInfo.profession)) {
        setCustomProfession(profilePersonalInfo.profession);
        setIsOtherProfessionSelected(true);
      } else {
        setIsOtherProfessionSelected(false);
      }
      setAbout(profile.about || {});
    }
  }, [heroFormDraft, profile, professionOptions]);

  // Set email from Redux store when user is available (always override with user email)
  useEffect(() => {
    if (user?.email) {
      setPersonalInfo(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  // Validation functions for real-time validation
  const validateField = (fieldName: string, value: string | undefined): string | null => {
    switch (fieldName) {
      case 'first_name':
        return validateName(value || '', 'First Name');
      case 'last_name':
        return validateName(value || '', 'Last Name');
      case 'email':
        return validateEmail(value || '');
      case 'phone_number':
        return validatePhoneSync(value || '');
      case 'date_of_birth':
        return validateDateOfBirth(value || '');
      case 'state_province':
        return validateStateProvince(value || '', true);
      case 'country':
        return validateCountry(value || '', true);
      case 'city':
        return validateCity(value || '', true);
      case 'profession':
        return validateProfession(value || '', true);
      case 'professional_summary':
        return validateProfessionalSummary(value || '');
      case 'linkedin_url':
        return validateLinkedInURL(value);
      case 'github_url':
        return validateGitHubURL(value);
      case 'website_url':
        return validateWebsiteURL(value);
      case 'current_status':
        return validateCurrentStatus(value || '', user?.role || 'professional');
      default:
        return null;
    }
  };

  // Handle field blur - validate on blur
  const handleFieldBlur = (fieldName: string, value: string | undefined) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
    const error = validateField(fieldName, value);
    setFieldErrors(prev => {
      if (error) {
        return { ...prev, [fieldName]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      }
    });
  };

  // Handle field change - validate on change for critical fields
  const handleFieldChange = (fieldName: string, value: string | undefined, updateFn: (value: string) => void) => {
    updateFn(value || '');
    
    // Clear error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    // Real-time validation for critical fields (only if already touched)
    if (touchedFields.has(fieldName)) {
      const error = validateField(fieldName, value);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    }
  };

  // Get error count for a step
  const getStepErrorCount = (step: number): number => {
    if (step === 1) {
      return ['first_name', 'last_name', 'email', 'phone_number', 'date_of_birth', 'gender', 'profession', 'country', 'state_province', 'city']
        .filter(field => fieldErrors[field]).length;
    }
    if (step === 2) {
      return ['professional_summary', 'industry', 'current_status']
        .filter(field => fieldErrors[field]).length;
    }
    if (step === 3) {
      return ['website_url', 'linkedin_url', 'github_url']
        .filter(field => fieldErrors[field]).length;
    }
    return 0;
  };

  // Handle draft saving
  const handleSaveDraft = () => {
    // Sync profession to about.industry when saving draft
    const draftAbout = {
      ...about,
      industry: about.industry || personalInfo.profession as About["industry"],
    };
    dispatch(
      saveHeroFormDraft({
        personal_information: personalInfo,
        about: draftAbout,
        savedAt: Date.now(),
      })
    );
    toast.success("Draft saved", { description: "Your progress has been saved" });
  };

  // Scroll to first error field
  const scrollToFirstError = () => {
    const firstErrorField = Object.keys(fieldErrors)[0];
    if (firstErrorField) {
      const element = document.querySelector(`[data-field="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    // Validate all steps before submission
    const step1Valid = validateStep(1);
    const step2Valid = validateStep(2);
    const step3Valid = validateStep(3);

    if (!step1Valid) {
      setCurrentStep(1);
      scrollToFirstError();
      return;
    }

    if (!step2Valid) {
      setCurrentStep(2);
      scrollToFirstError();
      return;
    }

    if (!step3Valid) {
      setCurrentStep(3);
      scrollToFirstError();
      return;
    }

    // Additional validation checks
    if (!personalInfo.country || !personalInfo.city) {
      toast.error("Please provide your location", {
        description: "Country and City are required fields"
      });
      setCurrentStep(3);
      scrollToFirstError();
      return;
    }

    // Sync profession to about.industry if not already set
    // For new profiles, industry comes from profession in Step 1, so we don't require it separately
    const finalAbout = {
      ...about,
      industry: about.industry || personalInfo.profession as About["industry"],
    };

    try {
      // Determine if this is a new profile or an update (already computed above, but keeping for clarity)
      const isNewProfile = !profile || !profile.personal_information?.first_name;

      if (isNewProfile) {
        // Use POST /profile/create for new profiles
        await dispatch(
          createNewProfile({
            heroData: {
              personal_information: personalInfo,
              about: finalAbout,
              savedAt: Date.now(),
            },
            userId: user.id,
          })
        ).unwrap();

        toast.success("Profile created!", {
          description: "Your profile has been successfully created",
        });

        // Refresh profile data to ensure all fields are loaded
        if (user?.id) {
          await dispatch(fetchProfile(user.id));
        }

        // Close modal and clear form after successful creation
        dispatch(clearHeroFormDraft());
        dispatch(closeHeroModal());
      } else {
        // Use PATCH /profile/{userId} for existing profiles
        await dispatch(
          updateHero({
            userId: user.id,
            heroData: {
              personal_information: personalInfo,
              about: finalAbout,
              savedAt: Date.now(),
            },
          })
        ).unwrap();

        toast.success("Profile updated!", {
          description: "Your profile has been successfully updated",
        });

        // Close modal and clear form after successful update
        dispatch(clearHeroFormDraft());
        dispatch(closeHeroModal());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Please try again";
      
      // Parse backend errors and map to fields if possible
      if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        // Try to extract field-specific errors
        const fieldMatch = errorMessage.match(/(\w+)\s+(?:is|must|should)/i);
        if (fieldMatch) {
          const fieldName = fieldMatch[1].toLowerCase().replace(/_/g, '_');
          setFieldErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
          setTouchedFields(prev => new Set(prev).add(fieldName));
        }
      }
      
      toast.error(`Failed to ${!profile ? "create" : "update"} profile`, {
        description: errorMessage,
      });
      
      // Scroll to first error if any
      if (Object.keys(fieldErrors).length > 0) {
        scrollToFirstError();
      }
    }
  };

  const handleClose = () => {
    if (
      personalInfo.first_name ||
      personalInfo.last_name ||
      about.professional_summary ||
      !isDraft
    ) {
      handleSaveDraft();
    }
    dispatch(closeHeroModal());
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];
    
    if (step === 1) {
      // Validate all Step 1 fields
      const step1Fields = [
        { name: 'first_name', value: personalInfo.first_name, label: 'First Name' },
        { name: 'last_name', value: personalInfo.last_name, label: 'Last Name' },
        { name: 'email', value: personalInfo.email, label: 'Email' },
        { name: 'phone_number', value: personalInfo.phone_number, label: 'Phone Number' },
        { name: 'date_of_birth', value: personalInfo.date_of_birth, label: 'Date of Birth' },
        { name: 'profession', value: personalInfo.profession, label: 'Profession' },
        { name: 'country', value: personalInfo.country, label: 'Country' },
        { name: 'state_province', value: personalInfo.state_province, label: 'State/Province' },
        { name: 'city', value: personalInfo.city, label: 'City' },
      ];

      step1Fields.forEach(({ name, value, label }) => {
        const error = validateField(name, value);
        if (error) {
          setFieldErrors(prev => ({ ...prev, [name]: error }));
          setTouchedFields(prev => new Set(prev).add(name));
          errors.push(error);
        }
      });

      if (!personalInfo.gender?.trim()) {
        setFieldErrors(prev => ({ ...prev, gender: 'Gender is required' }));
        setTouchedFields(prev => new Set(prev).add('gender'));
        errors.push('Gender is required');
      }

      if (errors.length > 0) {
        toast.error(`Please fix ${errors.length} error${errors.length > 1 ? 's' : ''} in Personal Information`, {
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : '')
        });
        return false;
      }
      return true;
    }
    
    if (step === 2) {
      // Validate Step 2 fields
      const step2Fields = [
        { name: 'professional_summary', value: about.professional_summary, label: 'Professional Summary' },
      ];

      step2Fields.forEach(({ name, value, label }) => {
        const error = validateField(name, value);
        if (error) {
          setFieldErrors(prev => ({ ...prev, [name]: error }));
          setTouchedFields(prev => new Set(prev).add(name));
          errors.push(error);
        }
      });

      // Industry validation (only for professionals editing existing profile)
      if (user?.role !== "student" && !isNewProfile && !about.industry?.trim()) {
        setFieldErrors(prev => ({ ...prev, industry: 'Industry is required' }));
        setTouchedFields(prev => new Set(prev).add('industry'));
        errors.push('Industry is required');
      }

      // Current status validation
      const statusError = validateCurrentStatus(about.current_status || '', user?.role || 'professional');
      if (statusError) {
        setFieldErrors(prev => ({ ...prev, current_status: statusError }));
        setTouchedFields(prev => new Set(prev).add('current_status'));
        errors.push(statusError);
      }

      if (errors.length > 0) {
        toast.error(`Please fix ${errors.length} error${errors.length > 1 ? 's' : ''} in Professional Details`, {
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : '')
        });
        return false;
      }
      return true;
    }
    
    if (step === 3) {
      // Validate Step 3 fields (optional, but validate format if provided)
      const step3Fields = [
        { name: 'website_url', value: about.website_url, label: 'Website' },
        { name: 'linkedin_url', value: about.linkedin_url, label: 'LinkedIn' },
        { name: 'github_url', value: about.github_url, label: 'GitHub' },
      ];

      step3Fields.forEach(({ name, value }) => {
        if (value && value.trim()) {
          const error = validateField(name, value);
          if (error) {
            setFieldErrors(prev => ({ ...prev, [name]: error }));
            setTouchedFields(prev => new Set(prev).add(name));
            errors.push(error);
          }
        }
      });

      if (errors.length > 0) {
        toast.error(`Please fix ${errors.length} error${errors.length > 1 ? 's' : ''} in Social Links`, {
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : '')
        });
        return false;
      }
      return true;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      if (validateStep(currentStep)) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={showHeroModal} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-tour="profile-modal-form">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" data-tour="profile-modal-title">Complete Your Profile</DialogTitle>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].description}
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((step, index) => {
              const errorCount = getStepErrorCount(step.id);
              const hasErrors = errorCount > 0;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="relative">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                        currentStep >= step.id
                          ? hasErrors
                            ? "bg-red-600 text-white"
                            : "bg-purple-600 text-white"
                          : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {step.id}
                    </div>
                    {hasErrors && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">{errorCount}</span>
                      </div>
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-colors ${
                        currentStep > step.id
                          ? hasErrors
                            ? "bg-red-600"
                            : "bg-purple-600"
                          : "bg-neutral-200 dark:bg-neutral-800"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Error Loading Profile</p>
                <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Field Error Summary */}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                  Please fix the following {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? 's' : ''}:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-200">
                  {Object.entries(fieldErrors).slice(0, 5).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                  {Object.keys(fieldErrors).length > 5 && (
                    <li className="text-red-600 dark:text-red-400">...and {Object.keys(fieldErrors).length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 py-4"
          >
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1: First Name | Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-field="first_name"
                        value={personalInfo.first_name || ""}
                        onChange={(e) => handleFieldChange('first_name', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, first_name: val })
                        )}
                        onBlur={() => handleFieldBlur('first_name', personalInfo.first_name)}
                        minLength={2}
                        maxLength={50}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.first_name
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.first_name && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.first_name && touchedFields.has('first_name') && personalInfo.first_name && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.first_name && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.first_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-field="last_name"
                        value={personalInfo.last_name || ""}
                        onChange={(e) => handleFieldChange('last_name', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, last_name: val })
                        )}
                        onBlur={() => handleFieldBlur('last_name', personalInfo.last_name)}
                        minLength={2}
                        maxLength={50}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.last_name
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.last_name && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.last_name && touchedFields.has('last_name') && personalInfo.last_name && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.last_name && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.last_name}
                      </p>
                    )}
                  </div>
                  
                  {/* Row 2: Email | Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={personalInfo.email || ""}
                      onChange={(e) =>
                        setPersonalInfo({ ...personalInfo, email: e.target.value })
                      }
                      disabled
                      className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Phone Number *
                    </label>
                    <PhoneInput
                      value={personalInfo.phone_number || undefined}
                      onChange={(value) => {
                        handleFieldChange('phone_number', value || '', (val) => 
                          setPersonalInfo({ ...personalInfo, phone_number: val })
                        );
                      }}
                      onBlur={() => handleFieldBlur('phone_number', personalInfo.phone_number)}
                      required
                      placeholder="Enter phone number"
                      error={fieldErrors.phone_number}
                    />
                    {fieldErrors.phone_number && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.phone_number}
                      </p>
                    )}
                  </div>
                  
                  {/* Row 3: Date of Birth | Gender */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        data-field="date_of_birth"
                        value={personalInfo.date_of_birth || ""}
                        onChange={(e) => handleFieldChange('date_of_birth', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, date_of_birth: val })
                        )}
                        onBlur={() => handleFieldBlur('date_of_birth', personalInfo.date_of_birth)}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.date_of_birth
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.date_of_birth && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.date_of_birth && touchedFields.has('date_of_birth') && personalInfo.date_of_birth && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.date_of_birth && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.date_of_birth}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Gender *
                    </label>
                    <div className="relative">
                      <select
                        value={personalInfo.gender || ""}
                        onChange={(e) => {
                          const value = e.target.value as PersonalInformation["gender"];
                          setPersonalInfo({ ...personalInfo, gender: value });
                          if (fieldErrors.gender) {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.gender;
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => {
                          setTouchedFields(prev => new Set(prev).add('gender'));
                          if (!personalInfo.gender?.trim()) {
                            setFieldErrors(prev => ({ ...prev, gender: 'Gender is required' }));
                          }
                        }}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.gender
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      {fieldErrors.gender && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                      )}
                      {!fieldErrors.gender && touchedFields.has('gender') && personalInfo.gender && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                      )}
                    </div>
                    {fieldErrors.gender && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.gender}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Row 4: Profession | Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Profession *
                    </label>
                    <select
                      value={
                        personalInfo.profession && !professionOptions.includes(personalInfo.profession)
                          ? "Other"
                          : (personalInfo.profession || "")
                      }
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue === "Other") {
                          setIsOtherProfessionSelected(true);
                          // Keep existing custom profession value if it exists
                          if (customProfession) {
                            setPersonalInfo({ ...personalInfo, profession: customProfession });
                            // Sync profession to about.industry
                            setAbout(prev => ({ ...prev, industry: customProfession as About["industry"] }));
                          } else if (personalInfo.profession && !professionOptions.includes(personalInfo.profession)) {
                            // Keep existing custom value
                            setCustomProfession(personalInfo.profession);
                            // Sync profession to about.industry
                            setAbout(prev => ({ ...prev, industry: personalInfo.profession as About["industry"] }));
                          } else {
                            // Don't set profession to empty - keep it as "Other" in the dropdown but allow user to type
                            // Leave profession as is for now, user will type in the input
                            if (!personalInfo.profession) {
                              setPersonalInfo({ ...personalInfo, profession: "" });
                            }
                            setCustomProfession("");
                          }
                        } else if (selectedValue === "") {
                          setIsOtherProfessionSelected(false);
                          setPersonalInfo({ ...personalInfo, profession: "" });
                          setCustomProfession("");
                          setAbout(prev => ({ ...prev, industry: undefined }));
                        } else {
                          setIsOtherProfessionSelected(false);
                          setPersonalInfo({ ...personalInfo, profession: selectedValue });
                          setCustomProfession("");
                          // Sync profession to about.industry
                          setAbout(prev => ({ ...prev, industry: selectedValue as About["industry"] }));
                        }
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Profession</option>
                      {professionOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                      {!hasBuiltInOtherOption && <option value="Other">Other</option>}
                    </select>
                    
                    {/* Show custom profession input when "Other" is selected */}
                    {(() => {
                      const dropdownValue = personalInfo.profession && !professionOptions.includes(personalInfo.profession)
                        ? "Other"
                        : (personalInfo.profession || "");
                      const showInput = isOtherProfessionSelected || dropdownValue === "Other";
                      
                      return showInput ? (
                        <div className="mt-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={customProfession || (personalInfo.profession && !professionOptions.includes(personalInfo.profession) ? personalInfo.profession : "") || ""}
                              onChange={(e) => {
                                const value = e.target.value.slice(0, 100); // Max 100 characters
                                setCustomProfession(value);
                                handleFieldChange('profession', value, (val) => {
                                  setPersonalInfo({ ...personalInfo, profession: val });
                                  // Sync profession to about.industry
                                  setAbout(prev => ({ ...prev, industry: val as About["industry"] }));
                                });
                              }}
                              onBlur={() => handleFieldBlur('profession', personalInfo.profession)}
                              placeholder="Enter your profession (max 100 characters)"
                              maxLength={100}
                              className={`w-full px-4 py-2 rounded-xl border ${
                                fieldErrors.profession
                                  ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                                  : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                            />
                            {fieldErrors.profession && (
                              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                            )}
                            {!fieldErrors.profession && touchedFields.has('profession') && personalInfo.profession && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-neutral-500">
                              {(customProfession || (personalInfo.profession && !professionOptions.includes(personalInfo.profession) ? personalInfo.profession : "") || "").length}/100 characters
                            </p>
                            {fieldErrors.profession && (
                              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {fieldErrors.profession}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {fieldErrors.profession && !isOtherProfessionSelected && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.profession}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Country *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-field="country"
                        value={personalInfo.country || ""}
                        onChange={(e) => handleFieldChange('country', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, country: val })
                        )}
                        onBlur={() => handleFieldBlur('country', personalInfo.country)}
                        minLength={2}
                        maxLength={100}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.country
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.country && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.country && touchedFields.has('country') && personalInfo.country && personalInfo.country.length >= 2 && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.country && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.country}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Row 6: State/Province | City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      State/Province *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-field="state_province"
                        value={personalInfo.state_province || ""}
                        onChange={(e) => handleFieldChange('state_province', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, state_province: val })
                        )}
                        onBlur={() => handleFieldBlur('state_province', personalInfo.state_province)}
                        minLength={2}
                        maxLength={100}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.state_province
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.state_province && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.state_province && touchedFields.has('state_province') && personalInfo.state_province && personalInfo.state_province.length >= 2 && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.state_province && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.state_province}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      City *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        data-field="city"
                        value={personalInfo.city || ""}
                        onChange={(e) => handleFieldChange('city', e.target.value, (val) => 
                          setPersonalInfo({ ...personalInfo, city: val })
                        )}
                        onBlur={() => handleFieldBlur('city', personalInfo.city)}
                        minLength={2}
                        maxLength={100}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.city
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {fieldErrors.city && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.city && touchedFields.has('city') && personalInfo.city && personalInfo.city.length >= 2 && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.city && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Professional Details
                </h3>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Professional Summary * (min 50 characters)
                  </label>
                    <div className="relative">
                    <textarea
                      data-field="professional_summary"
                      value={about.professional_summary || ""}
                      onChange={(e) => handleFieldChange('professional_summary', e.target.value, (val) => 
                        setAbout({ ...about, professional_summary: val })
                      )}
                      onBlur={() => handleFieldBlur('professional_summary', about.professional_summary)}
                      rows={4}
                      placeholder="Describe your professional background, skills, and career goals..."
                      className={`w-full px-4 py-2 rounded-xl border ${
                        fieldErrors.professional_summary
                          ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                          : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                      } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                      required
                      minLength={50}
                      maxLength={2000}
                    />
                    {fieldErrors.professional_summary && (
                      <AlertCircle className="absolute right-3 top-3 h-5 w-5 text-red-500" />
                    )}
                    {!fieldErrors.professional_summary && touchedFields.has('professional_summary') && about.professional_summary && about.professional_summary.length >= 50 && (
                      <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs ${
                      (about.professional_summary?.length || 0) < 50
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-500'
                    }`}>
                      {about.professional_summary?.length || 0}/50 characters (minimum)
                    </p>
                    {fieldErrors.professional_summary && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.professional_summary}
                      </p>
                    )}
                  </div>
                </div>
                {/* Industry and Current Status fields */}
                {/* For new profiles: Industry is hidden (profession is in Step 1), Current Status takes full width */}
                {/* For existing profiles (professionals): Industry and Current Status are in a 2-column grid */}
                <div className={`grid ${user?.role !== "student" && !isNewProfile ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}>
                  {/* Industry field - Only show for professionals when editing existing profile (not for new users) */}
                  {user?.role !== "student" && !isNewProfile && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Industry *
                      </label>
                      <div className="relative">
                        <select
                          data-field="industry"
                          value={about.industry || ""}
                          onChange={(e) => {
                            const value = e.target.value as About["industry"];
                            setAbout({ ...about, industry: value });
                            if (fieldErrors.industry) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.industry;
                                return newErrors;
                              });
                            }
                          }}
                          onBlur={() => {
                            setTouchedFields(prev => new Set(prev).add('industry'));
                            if (!about.industry?.trim()) {
                              setFieldErrors(prev => ({ ...prev, industry: 'Industry is required' }));
                            }
                          }}
                          className={`w-full px-4 py-2 rounded-xl border ${
                            fieldErrors.industry
                              ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                              : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                          required
                        >
                          <option value="">Select an industry</option>
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Finance">Finance</option>
                          <option value="Education">Education</option>
                          <option value="Other">Other</option>
                        </select>
                        {fieldErrors.industry && (
                          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                        )}
                        {!fieldErrors.industry && touchedFields.has('industry') && about.industry && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                        )}
                      </div>
                      {fieldErrors.industry && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {fieldErrors.industry}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Current Status field - Show for both roles */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {user?.role === "student" ? "Current Academic Status *" : "Current Status *"}
                    </label>
                    <div className="relative">
                      <select
                        data-field="current_status"
                        value={about.current_status || (user?.role === "student" ? "Studying" : "Employed")}
                        onChange={(e) => {
                          const value = e.target.value as About["current_status"];
                          setAbout({ ...about, current_status: value });
                          const error = validateCurrentStatus(value, user?.role || 'professional');
                          if (error) {
                            setFieldErrors(prev => ({ ...prev, current_status: error }));
                          } else {
                            setFieldErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.current_status;
                              return newErrors;
                            });
                          }
                        }}
                        onBlur={() => handleFieldBlur('current_status', about.current_status)}
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.current_status
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                        required
                      >
                        <option value="">Select status</option>
                        {user?.role === "student" ? (
                          <>
                            <option value="Studying">Studying</option>
                            <option value="Looking for internship">Looking for Internship</option>
                            <option value="Looking for job">Looking for Job</option>
                          </>
                        ) : (
                          <>
                            <option value="Employed">Employed</option>
                            <option value="Unemployed">Unemployed</option>
                            <option value="Freelancing">Freelancing</option>
                            <option value="Consulting">Consulting</option>
                            <option value="Employer">Employer</option>
                          </>
                        )}
                      </select>
                      {fieldErrors.current_status && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500 pointer-events-none" />
                      )}
                      {!fieldErrors.current_status && touchedFields.has('current_status') && about.current_status && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500 pointer-events-none" />
                      )}
                    </div>
                    {fieldErrors.current_status && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.current_status}
                      </p>
                    )}
                    {user?.role === "student" && !fieldErrors.current_status && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Select your current status as a student
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact & Social Links */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Contact & Social Links
                </h3>

                <div className="space-y-3 pt-4">
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Social Links (Optional)
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Website
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={about.website_url || ""}
                        onChange={(e) => handleFieldChange('website_url', e.target.value, (val) => 
                          setAbout({ ...about, website_url: val })
                        )}
                        onBlur={() => handleFieldBlur('website_url', about.website_url)}
                        placeholder="https://yourwebsite.com"
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.website_url
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                      />
                      {fieldErrors.website_url && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.website_url && touchedFields.has('website_url') && about.website_url && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.website_url && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.website_url}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      LinkedIn
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        data-field="linkedin_url"
                        value={about.linkedin_url || ""}
                        onChange={(e) => handleFieldChange('linkedin_url', e.target.value, (val) => 
                          setAbout({ ...about, linkedin_url: val })
                        )}
                        onBlur={() => handleFieldBlur('linkedin_url', about.linkedin_url)}
                        placeholder="https://linkedin.com/in/username"
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.linkedin_url
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                      />
                      {fieldErrors.linkedin_url && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.linkedin_url && touchedFields.has('linkedin_url') && about.linkedin_url && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.linkedin_url && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.linkedin_url}
                      </p>
                    )}
                    {!fieldErrors.linkedin_url && about.linkedin_url && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Example: https://linkedin.com/in/username
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      GitHub
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={about.github_url || ""}
                        onChange={(e) => handleFieldChange('github_url', e.target.value, (val) => 
                          setAbout({ ...about, github_url: val })
                        )}
                        onBlur={() => handleFieldBlur('github_url', about.github_url)}
                        placeholder="https://github.com/username"
                        className={`w-full px-4 py-2 rounded-xl border ${
                          fieldErrors.github_url
                            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                            : 'border-neutral-300 dark:border-neutral-700 focus:ring-purple-500'
                        } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent`}
                      />
                      {fieldErrors.github_url && (
                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                      {!fieldErrors.github_url && touchedFields.has('github_url') && about.github_url && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                    </div>
                    {fieldErrors.github_url && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.github_url}
                      </p>
                    )}
                    {!fieldErrors.github_url && about.github_url && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Example: https://github.com/username
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={updating}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevStep} disabled={updating}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {currentStep < STEPS.length ? (
              <Button onClick={handleNextStep} disabled={updating}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={updating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
