"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  closeAddSectionsModal,
  setActiveSectionForm,
  updateProfileSection,
} from "@/store/slices/profileSlice";
import { assignRole } from "@/store/slices/authSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RoleSwitchModal from "@/components/profile/RoleSwitchModal";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  Award as AwardIcon,
  FileCode,
  Trophy,
  Shield,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Education,
  Experience,
  Skill,
  Project,
  Award,
  Certification,
} from "@/lib/api/profile";

const SECTION_OPTIONS = [
  {
    id: "education",
    title: "Education",
    description: "Add your academic background",
    icon: GraduationCap,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "experience",
    title: "Experience",
    description: "Add your work experience",
    icon: Briefcase,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "skills",
    title: "Skills",
    description: "Showcase your expertise",
    icon: AwardIcon,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  {
    id: "projects",
    title: "Projects",
    description: "Highlight your projects",
    icon: FileCode,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    id: "awards",
    title: "Awards",
    description: "Share your achievements",
    icon: Trophy,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    id: "certifications",
    title: "Certifications",
    description: "Add your certifications",
    icon: Shield,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
  },
] as const;

type SectionType = (typeof SECTION_OPTIONS)[number]["id"];

type AddSectionsModalProps = {
  onSectionAdded?: () => void;
};

export function AddSectionsModal({ onSectionAdded }: AddSectionsModalProps) {
  const dispatch = useAppDispatch();
  const { showAddSectionsModal, activeSectionForm, addingSections } = useAppSelector(
    (state) => state.profile
  );
  const user = useAppSelector((state) => state.auth.user);
  
  // Role switch modal state
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [, setPendingSectionToOpen] = useState<SectionType | null>(null);

  const handleSelectSection = (sectionId: SectionType) => {
    // Validate role for Experience section only when user is a student
    const needsRoleSwitch = sectionId === "experience" && user?.role === "student";
    if (needsRoleSwitch) {
      // Close the AddSectionsModal
      dispatch(closeAddSectionsModal());
      // Open RoleSwitchModal after a brief delay to ensure smooth transition
      setTimeout(() => {
        setPendingSectionToOpen(sectionId);
        setShowRoleSwitchModal(true);
      }, 100);
      return;
    }
    dispatch(setActiveSectionForm(sectionId));
  };
  
  const handleConfirmRoleSwitch = async () => {
    if (!user) return;
    
    setIsRoleSwitching(true);
    try {
      await dispatch(assignRole("professional")).unwrap();
      toast.success("Role updated to Professional!");
      setShowRoleSwitchModal(false);
      setPendingSectionToOpen(null);
      
      // Reload the page to refresh all data with new role
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsRoleSwitching(false);
    }
  };
  
  const handleCloseRoleSwitchModal = () => {
    setShowRoleSwitchModal(false);
    setPendingSectionToOpen(null);
  };

  const handleClose = () => {
    dispatch(closeAddSectionsModal());
  };

  return (
    <Dialog open={showAddSectionsModal} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Add Sections</DialogTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Enhance your profile by adding more sections
              </p>
            </div>
          </div>
        </DialogHeader>

        {!activeSectionForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
            {SECTION_OPTIONS.map((section) => {
              const Icon = section.icon;
              const isAdding = addingSections[section.id as keyof typeof addingSections];

              return (
                <motion.button
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  disabled={isAdding}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`${section.bgColor} p-6 rounded-2xl text-left transition-all hover:shadow-lg border-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${section.color} p-3 rounded-xl bg-white dark:bg-neutral-800`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                        {section.title}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {section.description}
                      </p>
                    </div>
                    <Plus className={`h-5 w-5 ${section.color}`} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="py-4">
            {activeSectionForm === "education" && <EducationForm onSuccess={onSectionAdded} />}
            {activeSectionForm === "experience" && <ExperienceForm onSuccess={onSectionAdded} />}
            {activeSectionForm === "skills" && <SkillsForm onSuccess={onSectionAdded} />}
            {activeSectionForm === "projects" && <ProjectsForm onSuccess={onSectionAdded} />}
            {activeSectionForm === "awards" && <AwardsForm onSuccess={onSectionAdded} />}
            {activeSectionForm === "certifications" && <CertificationsForm onSuccess={onSectionAdded} />}
          </div>
        )}
      </DialogContent>
      
      {/* Role Switch Modal */}
      <RoleSwitchModal
        isOpen={showRoleSwitchModal}
        onClose={handleCloseRoleSwitchModal}
        currentRole={user?.role || "student"}
        targetRole="professional"
        message="Experience section is only available for Professionals. Would you like to switch your role to Professional?"
        onConfirmSwitch={handleConfirmRoleSwitch}
        isLoading={isRoleSwitching}
      />
    </Dialog>
  );
}

// Education Form Component
function EducationForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Partial<Education>>({
    institution_name: "",
    degree_type: undefined,
    field_of_study: "",
    start_year: new Date().getFullYear(),
    currently_studying: false,
    percentage: undefined,
    gpa_grade: undefined,
  });

  const [gradeType, setGradeType] = useState<'gpa' | 'percentage'>('gpa');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    // Validate institution name
    if (!formData.institution_name || formData.institution_name.trim().length === 0) {
      toast.error("Institution name is required");
      return;
    }
    if (formData.institution_name.trim().length < 2) {
      toast.error("Institution name must be at least 2 characters");
      return;
    }
    if (formData.institution_name.trim().length > 100) {
      toast.error("Institution name must not exceed 100 characters");
      return;
    }
    
    // Validate degree type
    if (!formData.degree_type || formData.degree_type.trim().length === 0) {
      toast.error("Degree type is required");
      return;
    }
    if (formData.degree_type.trim().length < 2) {
      toast.error("Degree type must be at least 2 characters");
      return;
    }
    if (formData.degree_type.trim().length > 100) {
      toast.error("Degree type must not exceed 100 characters");
      return;
    }
    
    // Validate field of study
    if (!formData.field_of_study || formData.field_of_study.trim().length === 0) {
      toast.error("Field of study is required");
      return;
    }
    if (formData.field_of_study.trim().length < 2) {
      toast.error("Field of study must be at least 2 characters");
      return;
    }
    if (formData.field_of_study.trim().length > 100) {
      toast.error("Field of study must not exceed 100 characters");
      return;
    }
    
    // Validate start year
    if (!formData.start_year) {
      toast.error("Start year is required");
      return;
    }

    // Start year cannot be in the future
    const currentYear = new Date().getFullYear();
    if (formData.start_year > currentYear) {
      toast.error("Start year cannot be in the future");
      return;
    }

    // Require selected grade type to be filled
    if (gradeType === 'gpa') {
      const hasGpaValue = !(
        formData.gpa_grade === undefined ||
        formData.gpa_grade === null ||
        (typeof formData.gpa_grade === 'string' && formData.gpa_grade.trim() === '')
      );

      if (hasGpaValue) {
        // Validate GPA/Grade: Allow numbers (1-10) or letter grades (A+, A, B, C, O, etc.)
        const gpaValue = typeof formData.gpa_grade === 'string' ? formData.gpa_grade.trim() : String(formData.gpa_grade);

        if (gpaValue) {
          const letterGradePattern = /^[A-Z][+-]?$/i;
          const numericValue = parseFloat(gpaValue);
          const isValidNumber = !isNaN(numericValue) && numericValue >= 1 && numericValue <= 10;
          const isValidLetter = letterGradePattern.test(gpaValue);

          if (!isValidNumber && !isValidLetter) {
            toast.error("GPA/Grade must be a number between 1 and 10 or a letter grade (A+, A, B, C, O, etc.)");
            return;
          }
        }
        // Clear percentage if GPA provided
        formData.percentage = undefined;
      } else {
        // Skip GPA if not provided
        formData.gpa_grade = undefined;
        formData.percentage = undefined;
      }
    } else {
      const hasPercentageValue = formData.percentage !== undefined && formData.percentage !== null;

      if (hasPercentageValue) {
        if (formData.percentage! < 0 || formData.percentage! > 100) {
          toast.error("Percentage must be between 0 and 100");
          return;
        }
        // Clear GPA if percentage provided
        formData.gpa_grade = undefined;
      } else {
        formData.gpa_grade = undefined;
        formData.percentage = undefined;
      }
    }
    
    try {
      await dispatch(
        updateProfileSection({
          userId: user.id,
          sectionType: "education",
          sectionData: formData as Education,
          currentSections: profile?.education || [],
        })
      ).unwrap();
      toast.success("Education added successfully!");
      dispatch(setActiveSectionForm(null));
      
      // Trigger profile refresh
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error("Failed to add education", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add Education</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => dispatch(setActiveSectionForm(null))}
        >
          Back
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Institution Name *
        </label>
        <input
          type="text"
          value={formData.institution_name}
          onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
          className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Degree Type *
          </label>
          <select
            value={formData.degree_type || ""}
            onChange={(e) => setFormData({ ...formData, degree_type: e.target.value as Education['degree_type'] })}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="">Select Degree Type</option>
            <option value="Bachelor's">Bachelor&apos;s</option>
            <option value="Master's">Master&apos;s</option>
            <option value="PhD">PhD</option>
            <option value="Diploma">Diploma</option>
            <option value="Certificate">Certificate</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Field of Study *
          </label>
          <input
            type="text"
            value={formData.field_of_study}
            onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
            placeholder="e.g., Computer Science"
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Start Year *
          </label>
          <input
            type="number"
            value={formData.start_year}
            onChange={(e) => setFormData({ ...formData, start_year: parseInt(e.target.value) })}
            min="1950"
            max={new Date().getFullYear() + 10}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            End Year
          </label>
          <input
            type="number"
            value={formData.end_year || ""}
            onChange={(e) =>
              setFormData({ ...formData, end_year: e.target.value ? parseInt(e.target.value) : undefined })
            }
            min={formData.start_year}
            max={new Date().getFullYear() + 10}
            disabled={formData.currently_studying}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Choose Grade Type</label>
        <div className="flex gap-6 mb-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gradeType"
              value="gpa"
              checked={gradeType === 'gpa'}
              onChange={() => setGradeType('gpa')}
              className="accent-purple-600"
            />
            <span className="text-sm">GPA/Grade (0-4)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="gradeType"
              value="percentage"
              checked={gradeType === 'percentage'}
              onChange={() => setGradeType('percentage')}
              className="accent-purple-600"
            />
            <span className="text-sm">Percentage (0-100)</span>
          </label>
        </div>
        {gradeType === 'gpa' ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">GPA/Grade</label>
            <input
              type="text"
              value={typeof formData.gpa_grade === 'string' ? formData.gpa_grade : (formData.gpa_grade?.toString() || '')}
              onChange={(e) => {
                const value = e.target.value.trim();
                // Allow numbers (1-10) or letter grades (A+, A, B, C, O, etc.)
                if (value === '') {
                  setFormData({ ...formData, gpa_grade: undefined });
                } else {
                  // Store as string to support both numbers and letter grades
                  // Try to parse as number first, if valid, store as number, otherwise store as string
                  const numericValue = parseFloat(value);
                  if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 10) {
                    setFormData({ ...formData, gpa_grade: numericValue });
                  } else {
                    setFormData({ ...formData, gpa_grade: value as string });
                  }
                }
              }}
              placeholder="e.g., 9.5 or A+"
              className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Enter a number (1-10) or letter grade (A+, A, B, C, O, etc.)</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Percentage</label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.percentage ?? ""}
              onChange={(e) => {
                // Only allow numbers for percentage
                const value = e.target.value;
                const numericValue = value.replace(/[^0-9.]/g, '');
                
                if (numericValue === '' || numericValue === '.') {
                  setFormData({ ...formData, percentage: undefined });
                } else {
                  const numValue = parseFloat(numericValue);
                  if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                    setFormData({ ...formData, percentage: numValue });
                  }
                }
              }}
              placeholder="e.g., 85.5"
              className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Enter numbers only (0-100)</p>
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          checked={formData.currently_studying}
          onChange={(e) => setFormData({ ...formData, currently_studying: e.target.checked })}
          className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm text-neutral-900 dark:text-white">Currently studying here</span>
      </label>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => dispatch(setActiveSectionForm(null))}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addingSections.education}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {addingSections.education ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Education"
          )}
        </Button>
      </div>
    </form>
  );
}

// Experience Form Component
function ExperienceForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Experience>({
    company_name: "",
    job_title: "",
    employment_type: "Full-time",
    industry: "",
    start_date: "",
    currently_working: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    // Validate company name
    if (!formData.company_name || formData.company_name.trim().length === 0) {
      toast.error("Company name is required");
      return;
    }
    if (formData.company_name.trim().length < 2) {
      toast.error("Company name must be at least 2 characters");
      return;
    }
    if (formData.company_name.trim().length > 100) {
      toast.error("Company name must not exceed 100 characters");
      return;
    }
    if (!/^[a-zA-Z0-9\s\-&.,()]+$/.test(formData.company_name.trim())) {
      toast.error("Company name can only contain letters, numbers, spaces, and common business symbols (-, &, ., comma, parentheses)");
      return;
    }
    
    // Validate job title
    if (!formData.job_title || formData.job_title.trim().length === 0) {
      toast.error("Job title is required");
      return;
    }
    if (formData.job_title.trim().length < 2) {
      toast.error("Job title must be at least 2 characters");
      return;
    }
    if (formData.job_title.trim().length > 100) {
      toast.error("Job title must not exceed 100 characters");
      return;
    }
    
    // Validate industry
    if (!formData.industry || formData.industry.trim().length === 0) {
      toast.error("Industry is required");
      return;
    }
    if (formData.industry.trim().length < 2) {
      toast.error("Industry must be at least 2 characters");
      return;
    }
    if (formData.industry.trim().length > 100) {
      toast.error("Industry must not exceed 100 characters");
      return;
    }
    
    // Validate job description length if provided
    if (formData.job_description && formData.job_description.trim().length > 0) {
      const descLength = formData.job_description.trim().length;
      if (descLength < 50) {
        toast.error("Job description must be at least 50 characters");
        return;
      }
      if (descLength > 2000) {
        toast.error("Job description must not exceed 2000 characters");
        return;
      }
    }
    
    // Validate end_date if not currently working
    if (!formData.currently_working && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate < startDate) {
        toast.error("End date must be after start date");
        return;
      }
      if (endDate > today) {
        toast.error("End date cannot be in the future");
        return;
      }
    }
    
    // Prepare data - remove end_date if currently working
    const submissionData: Experience = {
      ...formData,
      job_description: formData.job_description?.trim() || undefined,
    };
    
    if (formData.currently_working) {
      delete submissionData.end_date;
    }
    
    try {
      await dispatch(
        updateProfileSection({
          userId: user.id,
          sectionType: "experience",
          sectionData: submissionData,
          currentSections: profile?.experience || [],
        })
      ).unwrap();
      toast.success("Experience added successfully!");
      dispatch(setActiveSectionForm(null));
      
      // Trigger profile refresh
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error("Failed to add experience", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add Experience</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => dispatch(setActiveSectionForm(null))}
        >
          Back
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Employment Type *
          </label>
          <select
            value={formData.employment_type}
            onChange={(e) =>
              setFormData({ ...formData, employment_type: e.target.value as Experience["employment_type"] })
            }
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Industry *
        </label>
        <input
          type="text"
          value={formData.industry || ""}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          placeholder="e.g., Technology, Healthcare, Finance"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            End Date {!formData.currently_working && "*"}
          </label>
          <input
            type="date"
            value={formData.end_date || ""}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
            max={new Date().toISOString().split('T')[0]}
            disabled={formData.currently_working}
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            required={!formData.currently_working}
          />
          {!formData.currently_working && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              End date must be after start date and not in the future
            </p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          checked={formData.currently_working}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setFormData({ 
              ...formData, 
              currently_working: isChecked,
              end_date: isChecked ? undefined : formData.end_date,
            });
          }}
          className="w-4 h-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
        />
        <span className="text-sm text-neutral-900 dark:text-white">Currently working here</span>
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Job Description {formData.job_description && formData.job_description.trim().length > 0 ? "*" : "(Optional)"}
          </label>
          <span className={`text-xs ${
            !formData.job_description || formData.job_description.trim().length === 0
              ? "text-neutral-400"
              : formData.job_description.trim().length < 50
              ? "text-red-500"
              : formData.job_description.trim().length > 2000
              ? "text-red-500"
              : "text-green-600"
          }`}>
            {formData.job_description?.trim().length || 0} / 50-2000 characters
          </span>
        </div>
        <textarea
          value={formData.job_description || ""}
          onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
          rows={4}
          className={`w-full px-4 py-2 rounded-xl border ${
            formData.job_description && formData.job_description.trim().length > 0 && 
            (formData.job_description.trim().length < 50 || formData.job_description.trim().length > 2000)
              ? "border-red-500 dark:border-red-500"
              : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          placeholder="Describe your responsibilities and achievements... (If you start typing, minimum 50 characters required)"
        />
        {formData.job_description && formData.job_description.trim().length > 0 && formData.job_description.trim().length < 50 && (
          <p className="text-xs text-red-500 mt-1">
            Please add at least {50 - formData.job_description.trim().length} more characters
          </p>
        )}
        {formData.job_description && formData.job_description.trim().length > 2000 && (
          <p className="text-xs text-red-500 mt-1">
            Please remove {formData.job_description.trim().length - 2000} characters
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => dispatch(setActiveSectionForm(null))}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addingSections.experience}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {addingSections.experience ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Experience"
          )}
        </Button>
      </div>
    </form>
  );
}

// Skills Form Component
function SkillsForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Skill>({
    skill_name: "",
    proficiency_level: "Intermediate",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    // Validate skill name
    if (!formData.skill_name || formData.skill_name.trim().length === 0) {
      toast.error("Skill name is required");
      return;
    }
    if (formData.skill_name.trim().length < 2) {
      toast.error("Skill name must be at least 2 characters");
      return;
    }
    if (formData.skill_name.trim().length > 50) {
      toast.error("Skill name must not exceed 50 characters");
      return;
    }
    
    // Validate years of experience if provided
    if (formData.years_of_experience !== undefined && (formData.years_of_experience < 0 || formData.years_of_experience > 50)) {
      toast.error("Years of experience must be between 0 and 50");
      return;
    }
    
    try {
      await dispatch(
        updateProfileSection({
          userId: user.id,
          sectionType: "skills",
          sectionData: formData,
          currentSections: profile?.skills || [],
        })
      ).unwrap();
      toast.success("Skill added successfully!");
      dispatch(setActiveSectionForm(null));
      
      // Trigger profile refresh
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      toast.error("Failed to add skill");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add Skill</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => dispatch(setActiveSectionForm(null))}
        >
          Back
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Skill Name *
        </label>
        <input
          type="text"
          value={formData.skill_name}
          onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
          placeholder="e.g., React, Python, Project Management"
          className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Proficiency Level *
          </label>
          <select
            value={formData.proficiency_level}
            onChange={(e) =>
              setFormData({ ...formData, proficiency_level: e.target.value as Skill["proficiency_level"] })
            }
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Years of Experience
          </label>
          <input
            type="number"
            value={formData.years_of_experience || ""}
            onChange={(e) =>
              setFormData({ ...formData, years_of_experience: e.target.value ? parseInt(e.target.value) : undefined })
            }
            min="0"
            max="50"
            className="w-full px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => dispatch(setActiveSectionForm(null))}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addingSections.skills}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {addingSections.skills ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Skill"
          )}
        </Button>
      </div>
    </form>
  );
}

// Placeholder forms for Projects, Awards, and Certifications
function ProjectsForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Partial<Project>>({
    project_title: "",
    description: "",
    technologies: [],
    start_date: "",
    end_date: "",
    project_url: "",
    github_url: "",
    demo_url: "",
    role: "",
    team_size: undefined,
    currently_working: false,
  });
  const [techInput, setTechInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Project title - required, 2-100 chars
    if (!formData.project_title || formData.project_title.length < 2 || formData.project_title.length > 100) {
      newErrors.project_title = "Project title must be 2-100 characters.";
    }

    // Description - required, 100-2000 chars
    if (!formData.description || formData.description.length < 100 || formData.description.length > 2000) {
      newErrors.description = "Description must be 100-2000 characters.";
    }

    // Technologies - optional, max 10 items
    if (formData.technologies && formData.technologies.length > 10) {
      newErrors.technologies = "Maximum 10 technologies allowed.";
    }

    // Date format validation (MM/YYYY)
    const dateRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (formData.start_date && !dateRegex.test(formData.start_date)) {
      newErrors.start_date = "Start date must be in MM/YYYY format.";
    }
    if (formData.end_date && !dateRegex.test(formData.end_date)) {
      newErrors.end_date = "End date must be in MM/YYYY format.";
    }

    // URL validations
    const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/;
    if (formData.project_url && !urlRegex.test(formData.project_url)) {
      newErrors.project_url = "Project URL must be valid.";
    }
    if (formData.github_url && (!urlRegex.test(formData.github_url) || !formData.github_url.includes("github.com"))) {
      newErrors.github_url = "GitHub URL must be valid and from github.com.";
    }
    if (formData.demo_url && !urlRegex.test(formData.demo_url)) {
      newErrors.demo_url = "Demo URL must be valid.";
    }

    // Role - optional, max 50 chars
    if (formData.role && formData.role.length > 50) {
      newErrors.role = "Role must be less than 50 characters.";
    }

    // Team size - optional, 1-50
    if (formData.team_size && (formData.team_size < 1 || formData.team_size > 50)) {
      newErrors.team_size = "Team size must be between 1 and 50.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors");
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }
    try {
      // Get existing projects from profile (or empty array)
      const existingProjects = Array.isArray(profile?.projects) ? profile.projects : [];
      // Add new project to the array
      const updatedProjects = [...existingProjects, formData as Project];
      // Call edit API directly with all projects
      const { updateProjectsSection } = await import('@/lib/api/profile');
      await updateProjectsSection(user.id, updatedProjects);
      
      // Refresh profile to get updated data
      const { fetchProfile } = await import('@/store/slices/profileSlice');
      await dispatch(fetchProfile(user.id));
      
      toast.success("Project added successfully!");
      // Reset form
      setFormData({
        project_title: "",
        description: "",
        technologies: [],
        start_date: "",
        end_date: "",
        project_url: "",
        github_url: "",
        demo_url: "",
        role: "",
        team_size: undefined,
        currently_working: false,
      });
      setTechInput("");
      setErrors({});
      if (onSuccess) {
        onSuccess();
      }
      dispatch(closeAddSectionsModal());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to add project";
      toast.error(errorMsg);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "team_size") {
      setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const handleAddTech = () => {
    if (techInput.trim() && techInput.length >= 2 && techInput.length <= 30) {
      if ((formData.technologies?.length || 0) < 10) {
        setFormData((prev) => ({
          ...prev,
          technologies: [...(prev.technologies || []), techInput.trim()],
        }));
        setTechInput("");
      }
    } else if (techInput.trim()) {
      toast.error("Technology name must be 2-30 characters");
    }
  };

  const handleRemoveTech = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      technologies: prev.technologies?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Project Title *
        </label>
        <input
          type="text"
          name="project_title"
          value={formData.project_title || ""}
          onChange={handleChange}
          placeholder="e.g., E-commerce Platform"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.project_title ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          required
        />
        {errors.project_title && <p className="text-xs text-red-500 mt-1">{errors.project_title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description || ""}
          onChange={handleChange}
          placeholder="Brief description of the project..."
          rows={4}
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.description ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      {/* Technologies */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Technologies (Max 10)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTech();
              }
            }}
            placeholder="Add technology (2-30 chars)..."
            className="flex-1 px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={handleAddTech}
            disabled={(formData.technologies?.length || 0) >= 10}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.technologies?.map((tech, index) => (
            <span
              key={index}
              className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {tech}
              <button
                type="button"
                onClick={() => handleRemoveTech(index)}
                className="hover:text-red-500 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {errors.technologies && <p className="text-xs text-red-500 mt-1">{errors.technologies}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Start Date (MM/YYYY)
          </label>
          <input
            type="text"
            name="start_date"
            value={formData.start_date || ""}
            onChange={handleChange}
            placeholder="01/2024"
            className={`w-full px-4 py-2 rounded-xl border ${
              errors.start_date ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          />
          {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
        </div>

        {!formData.currently_working && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              End Date (MM/YYYY)
            </label>
            <input
              type="text"
              name="end_date"
              value={formData.end_date || ""}
              onChange={handleChange}
              placeholder="05/2024"
              className={`w-full px-4 py-2 rounded-xl border ${
                errors.end_date ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
            />
            {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="currently_working"
          name="currently_working"
          checked={formData.currently_working}
          onChange={handleChange}
          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
        />
        <label htmlFor="currently_working" className="text-sm text-neutral-700 dark:text-neutral-300">
          Currently working on this project
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Role
          </label>
          <input
            type="text"
            name="role"
            value={formData.role || ""}
            onChange={handleChange}
            placeholder="e.g., Full Stack Developer"
            className={`w-full px-4 py-2 rounded-xl border ${
              errors.role ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          />
          {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Team Size
          </label>
          <input
            type="number"
            name="team_size"
            value={formData.team_size?.toString() || ""}
            onChange={handleChange}
            placeholder="e.g., 5"
            min="1"
            max="50"
            className={`w-full px-4 py-2 rounded-xl border ${
              errors.team_size ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          />
          {errors.team_size && <p className="text-xs text-red-500 mt-1">{errors.team_size}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Project URL
        </label>
        <input
          type="text"
          name="project_url"
          value={formData.project_url || ""}
          onChange={handleChange}
          placeholder="https://project.com"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.project_url ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
        />
        {errors.project_url && <p className="text-xs text-red-500 mt-1">{errors.project_url}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          GitHub URL
        </label>
        <input
          type="text"
          name="github_url"
          value={formData.github_url || ""}
          onChange={handleChange}
          placeholder="https://github.com/user/repo"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.github_url ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
        />
        {errors.github_url && <p className="text-xs text-red-500 mt-1">{errors.github_url}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Demo URL
        </label>
        <input
          type="text"
          name="demo_url"
          value={formData.demo_url || ""}
          onChange={handleChange}
          placeholder="https://demo.project.com"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.demo_url ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
        />
        {errors.demo_url && <p className="text-xs text-red-500 mt-1">{errors.demo_url}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch(closeAddSectionsModal())}
          disabled={addingSections.projects}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={addingSections.projects}>
          {addingSections.projects ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function AwardsForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Partial<Award>>({
    award_name: "",
    issuing_organization: "",
    date_received: "",
    description: "",
    certificate_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Award name - required, 5-100 chars
    if (!formData.award_name || formData.award_name.length < 5 || formData.award_name.length > 100) {
      newErrors.award_name = "Award name must be 5-100 characters.";
    }

    // Issuing organization - required, 2-100 chars
    if (!formData.issuing_organization || formData.issuing_organization.length < 2 || formData.issuing_organization.length > 100) {
      newErrors.issuing_organization = "Issuing organization must be 2-100 characters.";
    }

    // Date received - required, MM/YYYY format
    const dateRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    if (!formData.date_received || !dateRegex.test(formData.date_received)) {
      newErrors.date_received = "Date must be in MM/YYYY format.";
    }

    // Description - optional, 50-500 chars
    if (formData.description && (formData.description.length < 50 || formData.description.length > 500)) {
      newErrors.description = "Description must be 50-500 characters if provided.";
    }

    // Certificate URL - optional, valid URL
    const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/;
    if (formData.certificate_url && !urlRegex.test(formData.certificate_url)) {
      newErrors.certificate_url = "Certificate URL must be valid.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors");
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }
    
    try {
      await dispatch(
        updateProfileSection({
          userId: user.id,
          sectionType: "awards",
          sectionData: formData as Award,
          currentSections: profile?.awards || [],
        })
      ).unwrap();
      
      toast.success("Award added successfully!");
      setFormData({
        award_name: "",
        issuing_organization: "",
        date_received: "",
        description: "",
        certificate_url: "",
      });
      setErrors({});
      
      // Trigger profile refresh
      if (onSuccess) {
        onSuccess();
      }
      dispatch(closeAddSectionsModal());
    } catch (error) {
      toast.error("Failed to add award", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Award Name *
        </label>
        <input
          type="text"
          value={formData.award_name || ""}
          onChange={(e) => setFormData({ ...formData, award_name: e.target.value })}
          placeholder="e.g., Best Innovator Award"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.award_name ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          required
        />
        {errors.award_name && <p className="text-xs text-red-500 mt-1">{errors.award_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Issuing Organization *
        </label>
        <input
          type="text"
          value={formData.issuing_organization || ""}
          onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
          placeholder="e.g., Tech Excellence Foundation"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.issuing_organization ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          required
        />
        {errors.issuing_organization && <p className="text-xs text-red-500 mt-1">{errors.issuing_organization}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Date Received (MM/YYYY) *
        </label>
        <input
          type="text"
          value={formData.date_received || ""}
          onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
          placeholder="01/2024"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.date_received ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
          required
        />
        {errors.date_received && <p className="text-xs text-red-500 mt-1">{errors.date_received}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Description (50-500 chars)
        </label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the award and achievement..."
          rows={4}
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.description ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none`}
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Certificate URL
        </label>
        <input
          type="text"
          value={formData.certificate_url || ""}
          onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
          placeholder="https://example.com/certificate"
          className={`w-full px-4 py-2 rounded-xl border ${
            errors.certificate_url ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500`}
        />
        {errors.certificate_url && <p className="text-xs text-red-500 mt-1">{errors.certificate_url}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => dispatch(closeAddSectionsModal())} disabled={addingSections.awards}>
          Cancel
        </Button>
        <Button type="submit" disabled={addingSections.awards}>
          {addingSections.awards ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Award
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function CertificationsForm({ onSuccess }: { onSuccess?: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { addingSections, profile } = useAppSelector((state) => state.profile);
  const [formData, setFormData] = useState<Partial<Certification>>({
    certification_name: "",
    issuing_authority: "",
    license_number: "",
    issue_date: "",
    expiration_date: "",
    verification_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<string | null>(null);
  const [certificateFileName, setCertificateFileName] = useState<string>("");
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Certification name - required, 5-100 chars
    if (!formData.certification_name || formData.certification_name.length < 5 || formData.certification_name.length > 100) {
      newErrors.certification_name = "Certification name must be 5-100 characters.";
    }

    // Issuing authority - required, 2-100 chars
    if (!formData.issuing_authority || formData.issuing_authority.length < 2 || formData.issuing_authority.length > 100) {
      newErrors.issuing_authority = "Issuing authority must be 2-100 characters.";
    }

    // Issue date - required, MM/YYYY format, not in future
    const [issueMonth, issueYear] = (formData.issue_date || '').split('/').map(Number);
    const issueDate = new Date(issueYear, issueMonth - 1);
    if (!issueMonth || !issueYear || isNaN(issueDate.getTime())) {
      newErrors.issue_date = "Issue date is required (MM/YYYY).";
    } else if (issueDate > new Date()) {
      newErrors.issue_date = "Issue date cannot be in the future.";
    }

    // Expiration date - optional, must be after issue date if provided
    if (formData.expiration_date) {
      const [expMonth, expYear] = (formData.expiration_date || '').split('/').map(Number);
      const expDate = new Date(expYear, expMonth - 1);
      if (!expMonth || !expYear || isNaN(expDate.getTime())) {
        newErrors.expiration_date = "Expiration date must be in MM/YYYY format.";
      } else if (issueDate >= expDate) {
        newErrors.expiration_date = "Expiration date must be after issue date.";
      }
    }

    // Verification URL - optional, valid URL
    if (formData.verification_url && !/^https?:\/\/.+/.test(formData.verification_url)) {
      newErrors.verification_url = "Must be a valid URL (https://...)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCertificateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCertificateError(null);
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setCertificateError('Invalid file type. Only JPG, PNG, and PDF are allowed.');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setCertificateError('File size exceeds 5MB limit.');
      return;
    }
    
    setCertificateFile(file);
    setCertificateFileName(file.name);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setCertificatePreview(previewUrl);
    } else {
      // For PDFs, just show the filename
      setCertificatePreview(null);
    }
  };
  
  const handleRemoveCertificate = () => {
    if (certificatePreview && certificatePreview.startsWith('blob:')) {
      URL.revokeObjectURL(certificatePreview);
    }
    setCertificateFile(null);
    setCertificatePreview(null);
    setCertificateFileName('');
    setCertificateError(null);
    // Clear certificate_url from formData
    setFormData((prev) => ({ ...prev, certificate_url: undefined }));
  };
  
  const handleCertificateUpload = async () => {
    if (!certificateFile || !user?.id) return;
    
    setIsUploadingCertificate(true);
    setCertificateError(null);
    
    try {
      // Upload certificate file using profile edit API with FormData
      const tokens = await import('@/lib/tokens').then(m => m.tokenStorage.getStoredTokens());
      if (!tokens?.access_token) {
        throw new Error('Authentication required');
      }
      
      // Get current certifications or create empty array
      const currentCertifications = profile?.certifications || [];
      
      // Create FormData with proper structure:
      // - field: 'certifications'
      // - data: JSON string of certifications array
      // - certificate: the file
      const uploadFormData = new FormData();
      uploadFormData.append('field', 'certifications');
      uploadFormData.append('data', JSON.stringify(currentCertifications));
      uploadFormData.append('certificate', certificateFile);
      
      // Import env to get API URL
      const { env } = await import('@/lib/env');
      const response = await fetch(`${env.API_URL}/profile/edit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
        body: uploadFormData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload certificate');
      }
      
      const data = await response.json();
      const certificateUrl = data.data?.certificateUrl || data.data?.certificate_url;
      
      if (certificateUrl) {
        setFormData((prev) => ({ ...prev, certificate_url: certificateUrl }));
        setCertificatePreview(certificateUrl);
        toast.success('Certificate uploaded successfully!');
      } else {
        throw new Error('Certificate URL not returned from server');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload certificate';
      setCertificateError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the validation errors");
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }
    
    try {
      // Import the updateCertificationsSection function that handles file upload
      const { updateCertificationsSection } = await import('@/lib/api/profile');
      
      // Prepare certification data
      const certificationToSave = {
        ...formData,
      } as Certification;
      
      // Get current certifications
      const currentCertifications = profile?.certifications || [];
      
      // Add new certification to array
      const updatedCertifications = [...currentCertifications, certificationToSave];
      const certificationIndex = updatedCertifications.length - 1;
      
      // Update certifications section with file if present
      setIsUploadingCertificate(true);
      await updateCertificationsSection(
        user.id,
        updatedCertifications,
        certificateFile || undefined,
        certificationIndex
      );
      
      toast.success("Certification added successfully!");
      setFormData({
        certification_name: "",
        issuing_authority: "",
        license_number: "",
        issue_date: "",
        expiration_date: "",
        verification_url: "",
      });
      setErrors({});
      handleRemoveCertificate(); // Clean up certificate states
      
      // Refresh profile to get updated data
      const { fetchProfile } = await import('@/store/slices/profileSlice');
      await dispatch(fetchProfile(user.id));
      
      // Trigger profile refresh
      if (onSuccess) {
        onSuccess();
      }
      dispatch(closeAddSectionsModal());
    } catch (error) {
      console.error('Certification save error:', error);
      toast.error("Failed to add certification", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Certification Name *
        </label>
        <input
          type="text"
          value={formData.certification_name || ""}
          onChange={(e) => setFormData({ ...formData, certification_name: e.target.value })}
          placeholder="e.g., AWS Certified Solutions Architect"
          className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
            errors.certification_name ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors`}
          required
        />
        {errors.certification_name && <p className="text-xs text-red-500 mt-1">{errors.certification_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Issuing Authority *
        </label>
        <input
          type="text"
          value={formData.issuing_authority || ""}
          onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
          placeholder="e.g., Amazon Web Services"
          className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
            errors.issuing_authority ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors`}
          required
        />
        {errors.issuing_authority && <p className="text-xs text-red-500 mt-1">{errors.issuing_authority}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          License Number
        </label>
        <input
          type="text"
          value={formData.license_number || ""}
          onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          placeholder="e.g., ABC-123-456"
          className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Issue Date (MM/YYYY) *
          </label>
          <input
            type="text"
            value={formData.issue_date || ""}
            onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            placeholder="01/2024"
            className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
              errors.issue_date ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            } rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors`}
            required
          />
          {errors.issue_date && <p className="text-xs text-red-500 mt-1">{errors.issue_date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Expiration Date (MM/YYYY)
          </label>
          <input
            type="text"
            value={formData.expiration_date || ""}
            onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
            placeholder="01/2027"
            className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
              errors.expiration_date ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
            } rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors`}
          />
          {errors.expiration_date && <p className="text-xs text-red-500 mt-1">{errors.expiration_date}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Verification URL
        </label>
        <input
          type="text"
          value={formData.verification_url || ""}
          onChange={(e) => setFormData({ ...formData, verification_url: e.target.value })}
          placeholder="https://verify.example.com/cert/123"
          className={`w-full bg-neutral-100 dark:bg-neutral-800 border ${
            errors.verification_url ? "border-red-500" : "border-neutral-300 dark:border-neutral-700"
          } rounded-lg p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-purple-500 transition-colors`}
        />
        {errors.verification_url && <p className="text-xs text-red-500 mt-1">{errors.verification_url}</p>}
      </div>

      {/* Certificate File Upload */}
      <div>
        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Certificate File (Optional)
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleCertificateFileChange}
              className="hidden"
              id="certificate-upload-add"
              disabled={isUploadingCertificate}
            />
            <label
              htmlFor="certificate-upload-add"
              className={`flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 ${isUploadingCertificate ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploadingCertificate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {certificateFile ? 'Change File' : 'Choose File (JPG, PNG, or PDF - Max 5MB)'}
                </>
              )}
            </label>
            {certificateFile && !isUploadingCertificate && (
              <button
                type="button"
                onClick={handleRemoveCertificate}
                className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* File Preview */}
          {certificatePreview && (
            <div className="mt-2">
              {certificateFile?.type.startsWith('image/') || (certificatePreview && !certificatePreview.startsWith('blob:')) ? (
                <div className="relative">
                  <img
                    src={certificatePreview}
                    alt="Certificate preview"
                    className="w-full max-h-48 object-contain rounded-lg border border-neutral-300 dark:border-neutral-700"
                  />
                  {certificateFile && !certificatePreview.startsWith('blob:') && (
                    <button
                      type="button"
                      onClick={handleCertificateUpload}
                      disabled={isUploadingCertificate}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isUploadingCertificate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Certificate'
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                  <Shield className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <span className="text-sm text-neutral-900 dark:text-white flex-1">{certificateFileName}</span>
                  {certificateFile && (
                    <button
                      type="button"
                      onClick={handleCertificateUpload}
                      disabled={isUploadingCertificate}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isUploadingCertificate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Certificate'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {certificateError && (
            <p className="text-xs text-red-500 mt-1">{certificateError}</p>
          )}
          
          {!certificateFile && !certificatePreview && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Upload a certificate file (JPG, PNG, or PDF) - Maximum 5MB
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => dispatch(closeAddSectionsModal())} disabled={addingSections.certifications}>
          Cancel
        </Button>
        <Button type="submit" disabled={addingSections.certifications}>
          {addingSections.certifications ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add Certification
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
