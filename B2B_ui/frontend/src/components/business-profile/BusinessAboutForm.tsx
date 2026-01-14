"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Save, Loader } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { 
  addBusinessAboutSection,
  setActiveSectionForm,
  closeAddSectionsModal,
  type BusinessProfileState,
  type BusinessAboutFormData 
} from "@/store/slices/businessProfileSlice";

interface BusinessAboutFormProps {
  isOpen: boolean;
  profileId: string;
}

export const BusinessAboutForm = ({ isOpen, profileId }: BusinessAboutFormProps) => {
  const dispatch = useAppDispatch();
  const { addingSections, error } = useAppSelector((state: { businessProfile: BusinessProfileState }) => state.businessProfile);

  const [formData, setFormData] = useState<BusinessAboutFormData>({
    description: "",
    mission: "",
    vision: "",
    core_values: "",
    founder_message: "",
    founded: "",
    headquarters: "",
    employees: "",
  });

  const handleClose = () => {
    dispatch(setActiveSectionForm(null));
  };

  const handleBackToSections = () => {
    dispatch(setActiveSectionForm(null));
  };

  const handleInputChange = (field: keyof BusinessAboutFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all required fields are filled
    const requiredFields = ['description', 'mission', 'vision', 'core_values', 'founded', 'headquarters', 'employees'] as const;
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === "");
    
    if (missingFields.length > 0) {
      // You could set a specific error message here if needed
      return;
    }

    try {
      await dispatch(addBusinessAboutSection({ profileId, aboutData: formData })).unwrap();
      // Reset form on success
      setFormData({
        description: "",
        mission: "",
        vision: "",
        core_values: "",
        founder_message: "",
        founded: "",
        headquarters: "",
        employees: "",
      });
      // Close the form and modal
      dispatch(setActiveSectionForm(null));
      dispatch(closeAddSectionsModal());
    } catch (error) {
      console.error("Failed to add about section:", error);
    }
  };

  const isLoading = addingSections.about;
  const requiredFields = ['description', 'mission', 'vision', 'core_values', 'founded', 'headquarters', 'employees'] as const;
  const hasAllRequiredData = requiredFields.every(field => formData[field] && formData[field].trim() !== "");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToSections}
                      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <svg className="h-5 w-5 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                        Add About Section
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                  >
                    <X className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
                  </button>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2 ml-12">
                  Tell people about your company story, mission, and values
                </p>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Description */}
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Company Description *
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Tell people what your company does and what makes it unique..."
                      rows={4}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
                    />
                  </div>

                  {/* Mission */}
                  <div>
                    <label htmlFor="mission" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Mission *
                    </label>
                    <textarea
                      id="mission"
                      value={formData.mission}
                      onChange={(e) => handleInputChange("mission", e.target.value)}
                      placeholder="What is your company mission?"
                      rows={3}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
                    />
                  </div>

                  {/* Vision */}
                  <div>
                    <label htmlFor="vision" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Vision *
                    </label>
                    <textarea
                      id="vision"
                      value={formData.vision}
                      onChange={(e) => handleInputChange("vision", e.target.value)}
                      placeholder="What is your company vision for the future?"
                      rows={3}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
                    />
                  </div>

                  {/* Core Values */}
                  <div>
                    <label htmlFor="core_values" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Core Values *
                    </label>
                    <textarea
                      id="core_values"
                      value={formData.core_values}
                      onChange={(e) => handleInputChange("core_values", e.target.value)}
                      placeholder="What values guide your company?"
                      rows={3}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
                    />
                  </div>

                  {/* Founded */}
                  <div>
                    <label htmlFor="founded" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Founded *
                    </label>
                    <input
                      type="text"
                      id="founded"
                      value={formData.founded}
                      onChange={(e) => handleInputChange("founded", e.target.value)}
                      placeholder="e.g., 2020, January 2020, etc."
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                    />
                  </div>

                  {/* Headquarters */}
                  <div>
                    <label htmlFor="headquarters" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Headquarters *
                    </label>
                    <input
                      type="text"
                      id="headquarters"
                      value={formData.headquarters}
                      onChange={(e) => handleInputChange("headquarters", e.target.value)}
                      placeholder="e.g., New York, NY"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                    />
                  </div>

                  {/* Employees */}
                  <div>
                    <label htmlFor="employees" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Number of Employees *
                    </label>
                    <input
                      type="text"
                      id="employees"
                      value={formData.employees}
                      onChange={(e) => handleInputChange("employees", e.target.value)}
                      placeholder="e.g., 50-200, 1-10, 500+"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                    />
                  </div>

                  {/* Founder Message */}
                  <div className="md:col-span-2">
                    <label htmlFor="founder_message" className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Founder Message (Optional)
                    </label>
                    <textarea
                      id="founder_message"
                      value={formData.founder_message}
                      onChange={(e) => handleInputChange("founder_message", e.target.value)}
                      placeholder="A personal message from the founder or leadership team..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none"
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    All fields marked with * are required
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!hasAllRequiredData || isLoading}
                      className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save About Section
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};