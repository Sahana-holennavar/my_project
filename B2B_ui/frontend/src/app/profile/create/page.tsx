"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProfile, validateProfileData, type ProfileData, type About } from "@/lib/api/profileCreation";
import { 
  validatePhoneSync,
  validateName,
  validateEmail,
  validateDateOfBirth,
  validateStateProvince,
  validateCountry,
  validateCity,
  validateProfession,
  validateProfessionalSummary,
  validateCurrentStatus,
} from "@/lib/validations/profileValidation";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { motion } from "framer-motion";
import { Check, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { UserTutorial } from "@/components/common/UserTutorial";
import { toast } from "sonner";

// Profession options constant
const PROFESSION_OPTIONS = [
  "IT Industry",
  "Biotechnology",
  "Manufacturing",
  "Industrial Automation",
  "R&D",
  "Human Resource",
  "Construction",
  "Architecture",
  "Interior design",
  "Design engineer",
];

export default function ProfileCreatePage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const userRole = user?.role || 'student';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validation function for fields
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
      case 'current_status':
        return validateCurrentStatus(value || '', userRole);
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


  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
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
  });
  
  // State for custom profession input when "Other" is selected
  const [customProfession, setCustomProfession] = useState("");
  const [isOtherProfessionSelected, setIsOtherProfessionSelected] = useState(false);

  // Set email from Redux store when user is available
  useEffect(() => {
    if (user?.email) {
      setPersonalInfo(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  // About State
  const [about, setAbout] = useState<About>({
    professional_summary: "",
    industry: "",
    current_status: "Studying",
  });
  
  // Role-based status definitions
  const studentStatuses = [
    'Studying',
    'Looking for internship',
    'Looking for job',
  ];
  
  const professionalStatuses = [
    'Employed',
    'Unemployed',
    'Freelancing',
    'Consulting',
    'Employer',
  ];
  
  // Get appropriate statuses based on user role
  const availableStatuses = userRole === 'student' ? studentStatuses : professionalStatuses;

  // Education State (at least one required)
  const [education, setEducation] = useState([
    {
      institution_name: "",
      degree_type: "",
      field_of_study: "",
      start_year: new Date().getFullYear(),
      end_year: undefined,
      gpa_grade: undefined,
      currently_studying: false,
    },
  ]);

  // Skills State
  const [skills, setSkills] = useState<Array<{
    skill_name: string;
    proficiency_level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    years_of_experience?: number;
  }>>([
    {
      skill_name: "",
      proficiency_level: "Intermediate",
      years_of_experience: undefined,
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccess(false);
    setFieldErrors({});

    // Validate all fields before submission
    const clientValidationErrors: string[] = [];
    const newFieldErrors: Record<string, string> = {};
    
    // Validate all personal info fields
    const personalFields = [
      { name: 'first_name', value: personalInfo.first_name },
      { name: 'last_name', value: personalInfo.last_name },
      { name: 'email', value: personalInfo.email },
      { name: 'phone_number', value: personalInfo.phone_number },
      { name: 'date_of_birth', value: personalInfo.date_of_birth },
      { name: 'country', value: personalInfo.country },
      { name: 'state_province', value: personalInfo.state_province },
      { name: 'city', value: personalInfo.city },
      { name: 'profession', value: personalInfo.profession },
    ];

    personalFields.forEach(({ name, value }) => {
      const error = validateField(name, value);
      if (error) {
        newFieldErrors[name] = error;
        clientValidationErrors.push(error);
        setTouchedFields(prev => new Set(prev).add(name));
      }
    });

    // Validate gender
    if (!personalInfo.gender?.trim()) {
      newFieldErrors.gender = 'Gender is required';
      clientValidationErrors.push('Gender is required');
      setTouchedFields(prev => new Set(prev).add('gender'));
    }

    // Validate about fields
    const aboutError = validateField('professional_summary', about.professional_summary);
    if (aboutError) {
      newFieldErrors.professional_summary = aboutError;
      clientValidationErrors.push(aboutError);
      setTouchedFields(prev => new Set(prev).add('professional_summary'));
    }

    // Validate current status
    const statusError = validateCurrentStatus(about.current_status || '', userRole);
    if (statusError) {
      newFieldErrors.current_status = statusError;
      clientValidationErrors.push(statusError);
      setTouchedFields(prev => new Set(prev).add('current_status'));
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrors(clientValidationErrors);
      toast.error(`Please fix ${clientValidationErrors.length} error${clientValidationErrors.length > 1 ? 's' : ''}`, {
        description: clientValidationErrors.slice(0, 3).join(', ') + (clientValidationErrors.length > 3 ? '...' : '')
      });
      
      // Scroll to first error
      const firstErrorField = Object.keys(newFieldErrors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[data-field="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }
      return;
    }

    // Build profile data - sync profession to about.industry
    const profileData: ProfileData = {
      personal_information: personalInfo,
      about: {
        ...about,
        industry: about.industry || personalInfo.profession as About["industry"],
      },
      education: education.filter(edu => edu.institution_name), // Only include filled education
      skills: skills.filter(skill => skill.skill_name), // Only include filled skills
    };

    // Validate (pass user role for role-specific validation)
    const serverValidationErrors = validateProfileData(profileData, userRole);
    if (serverValidationErrors.length > 0) {
      setErrors(serverValidationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createProfile(profileData);
      if (response.success) {
        setSuccess(true);
        
        // Dispatch tutorial action completed event
        window.dispatchEvent(new CustomEvent('tutorial-action-completed', {
          detail: { step: 1, action: 'profile-created' }
        }));
        
        setTimeout(() => {
          router.push("/profile");
        }, 2000);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message]);
      } else {
        setErrors(["An unexpected error occurred"]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2" data-tour="profile-form-title">
            Create Your Profile
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Complete your profile to get started
          </p>

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Please fix the following errors:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-200">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-900 dark:text-green-100 font-semibold">
                  Profile created successfully! Redirecting...
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8" data-tour="profile-form">
            {/* Personal Information Section */}
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Personal Information
              </h2>
              
              {/* Row 1: First Name | Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      data-field="first_name"
                      value={personalInfo.first_name}
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
                      value={personalInfo.last_name}
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
              </div>
              
              {/* Row 2: Email | Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => {
                      setPersonalInfo({ ...personalInfo, email: e.target.value });
                      if (fieldErrors.email) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    disabled
                    className={`w-full px-4 py-2 rounded-xl border ${
                      fieldErrors.email 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-neutral-300 dark:border-neutral-700'
                    } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                  )}
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
                    error={fieldErrors.phone_number}
                    placeholder="Enter phone number"
                    required
                  />
                  {fieldErrors.phone_number && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.phone_number}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Row 3: Date of Birth | Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Date of Birth *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      data-field="date_of_birth"
                      value={personalInfo.date_of_birth}
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
                      data-field="gender"
                      value={personalInfo.gender}
                      onChange={(e) => {
                        setPersonalInfo({ ...personalInfo, gender: e.target.value });
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Profession *
                  </label>
                  <select
                    value={
                      personalInfo.profession && !PROFESSION_OPTIONS.includes(personalInfo.profession)
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
                        } else if (personalInfo.profession && !PROFESSION_OPTIONS.includes(personalInfo.profession)) {
                          // Keep existing custom value
                          setCustomProfession(personalInfo.profession);
                        } else {
                          // Initialize with empty string
                          setPersonalInfo({ ...personalInfo, profession: "" });
                          setCustomProfession("");
                        }
                      } else if (selectedValue === "") {
                        setIsOtherProfessionSelected(false);
                        setPersonalInfo({ ...personalInfo, profession: "" });
                        setCustomProfession("");
                      } else {
                        setIsOtherProfessionSelected(false);
                        setPersonalInfo({ ...personalInfo, profession: selectedValue });
                        setCustomProfession("");
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                    required
                  >
                    <option value="">Select Profession</option>
                    {PROFESSION_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  
                  {/* Show custom profession input when "Other" is selected */}
                  {(isOtherProfessionSelected || (personalInfo.profession && !PROFESSION_OPTIONS.includes(personalInfo.profession))) && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customProfession || personalInfo.profession || ""}
                        onChange={(e) => {
                          const value = e.target.value.slice(0, 100); // Max 100 characters
                          setCustomProfession(value);
                          setPersonalInfo({ ...personalInfo, profession: value });
                        }}
                        placeholder="Enter your profession (max 100 characters)"
                        maxLength={100}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      />
                      <p className="text-xs text-neutral-500 mt-1">
                        {(customProfession || personalInfo.profession || "").length}/100 characters
                      </p>
                    </div>
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
                      value={personalInfo.country}
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
                      value={personalInfo.state_province}
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
                      value={personalInfo.city}
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
            </section>

            {/* About Section */}
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                About You
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Professional Summary * (min 50 characters)
                  </label>
                  <div className="relative">
                    <textarea
                      data-field="professional_summary"
                      value={about.professional_summary}
                      onChange={(e) => handleFieldChange('professional_summary', e.target.value, (val) =>
                        setAbout({ ...about, professional_summary: val })
                      )}
                      onBlur={() => handleFieldBlur('professional_summary', about.professional_summary)}
                      rows={4}
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
                      about.professional_summary.length < 50
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-500'
                    }`}>
                      {about.professional_summary.length}/50 characters (minimum)
                    </p>
                    {fieldErrors.professional_summary && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {fieldErrors.professional_summary}
                      </p>
                    )}
                  </div>
                </div>
                {/* Industry field - Only show for professionals, not students */}
                {userRole !== 'student' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Industry *
                      </label>
                      <input
                        type="text"
                        value={about.industry}
                        onChange={(e) => setAbout({ ...about, industry: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                )}
                {/* Current Status field - Show for both roles */}
                <div className={`grid ${userRole !== 'student' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-4`}>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      {userRole === 'student' ? 'Current Academic Status *' : 'Current Status *'}
                    </label>
                    <div className="relative">
                      <select
                        data-field="current_status"
                        value={about.current_status}
                        onChange={(e) => {
                          const value = e.target.value as About["current_status"];
                          setAbout({ ...about, current_status: value });
                          const error = validateCurrentStatus(value, userRole);
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
                      <option value="">Select Status</option>
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
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
                  </div>
                </div>
              </div>
            </section>

            {/* Education Section */}
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Education * (at least one required)
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      value={education[0].institution_name}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[0].institution_name = e.target.value;
                        setEducation(newEdu);
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Degree Type *
                    </label>
                    <input
                      type="text"
                      value={education[0].degree_type}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[0].degree_type = e.target.value;
                        setEducation(newEdu);
                      }}
                      placeholder="e.g., Bachelor's, Master's"
                      className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Field of Study *
                    </label>
                    <input
                      type="text"
                      value={education[0].field_of_study}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[0].field_of_study = e.target.value;
                        setEducation(newEdu);
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Skills Section */}
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Skills (Optional)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={skills[0].skill_name}
                    onChange={(e) => {
                      const newSkills = [...skills];
                      newSkills[0].skill_name = e.target.value;
                      setSkills(newSkills);
                    }}
                    placeholder="e.g., React, Python, Design"
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Proficiency Level
                  </label>
                  <select
                    value={skills[0].proficiency_level}
                    onChange={(e) => {
                      const newSkills = [...skills];
                      newSkills[0].proficiency_level = e.target.value as "Beginner" | "Intermediate" | "Advanced" | "Expert";
                      setSkills(newSkills);
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Profile"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
      
      {/* Tutorial Component */}
      <UserTutorial run={true} />
    </div>
  );
}
