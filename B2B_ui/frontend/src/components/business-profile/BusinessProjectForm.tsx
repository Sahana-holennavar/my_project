"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Save, Plus, Minus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createBusinessProjectAction, updateBusinessProjectAction, setActiveSectionForm } from "@/store/slices/businessProfileSlice";
import type { BusinessProject } from "@/lib/api/businessProfileSections";

interface BusinessProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  projectData?: BusinessProject | null;
}

interface ProjectFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  technologies: string[];
  client: string;
  project_url: string;
}

const PROJECT_STATUSES = [
  { value: "", label: "Select Status" },
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

export const BusinessProjectForm = ({ isOpen, onClose, mode, projectData }: BusinessProjectFormProps) => {
  const dispatch = useAppDispatch();
  const { selectedProfile, projects } = useAppSelector((state) => state.businessProfile);
  
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
    technologies: [],
    client: "",
    project_url: "",
  });
  
  const [techInput, setTechInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or projectData changes
  useEffect(() => {
    if (mode === "edit" && projectData) {
      setFormData({
        title: projectData.title || "",
        description: projectData.description || "",
        startDate: projectData.startDate ? new Date(projectData.startDate).toISOString().split('T')[0] : "",
        endDate: projectData.endDate ? new Date(projectData.endDate).toISOString().split('T')[0] : "",
        status: projectData.status || "",
        technologies: Array.isArray(projectData.technologies) 
          ? projectData.technologies 
          : typeof projectData.technologies === 'string' 
            ? projectData.technologies.split(',').map(t => t.trim()).filter(Boolean)
            : [],
        client: projectData.client || "",
        project_url: projectData.project_url || "",
      });
    } else {
      // Reset form for create mode
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "",
        technologies: [],
        client: "",
        project_url: "",
      });
    }
    setErrors({});
    setTechInput("");
  }, [mode, projectData, isOpen]);

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddTechnology = () => {
    const tech = techInput.trim();
    if (tech && !formData.technologies.includes(tech)) {
      setFormData(prev => ({
        ...prev,
        technologies: [...prev.technologies, tech]
      }));
      setTechInput("");
    }
  };

  const handleRemoveTechnology = (techToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(tech => tech !== techToRemove)
    }));
  };

  const handleTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTechnology();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Project title is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Project description is required";
    }
    
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "End date cannot be earlier than start date";
    }

    if (formData.project_url && !isValidUrl(formData.project_url)) {
      newErrors.project_url = "Please enter a valid URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedProfile?.profileId) {
      return;
    }

    try {
      const projectPayload = {
        ...formData,
        technologies: formData.technologies.length > 0 ? formData.technologies.join(', ') : undefined,
        client: formData.client.trim() || undefined,
        project_url: formData.project_url.trim() || undefined,
        endDate: formData.endDate || undefined,
      };

      if (mode === "edit" && projectData?.projectId) {
        await dispatch(updateBusinessProjectAction({
          profileId: selectedProfile.profileId,
          projectId: projectData.projectId,
          projectData: projectPayload
        })).unwrap();
      } else {
        await dispatch(createBusinessProjectAction({
          profileId: selectedProfile.profileId,
          projectData: projectPayload
        })).unwrap();
      }
      
      onClose();
    } catch (error) {
      console.error(`Failed to ${mode} project:`, error);
    }
  };

  const handleClose = () => {
    dispatch(setActiveSectionForm(null));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !projects.creating && !projects.updating) {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {mode === "edit" ? "Edit Project" : "Add New Project"}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {mode === "edit" ? "Update project information" : "Share details about your business project"}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={projects.creating || projects.updating}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Project Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                  placeholder="Enter project title"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              {/* Project Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white resize-none"
                  placeholder="Describe what the project is about, key features, and outcomes..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                  />
                  {errors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Status and Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Client
                  </label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => handleInputChange("client", e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                    placeholder="Client name (optional)"
                  />
                </div>
              </div>

              {/* Project URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Project URL
                </label>
                <input
                  type="url"
                  value={formData.project_url}
                  onChange={(e) => handleInputChange("project_url", e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                  placeholder="https://example.com (optional)"
                />
                {errors.project_url && (
                  <p className="text-red-500 text-sm mt-1">{errors.project_url}</p>
                )}
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Technologies Used
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={handleTechKeyDown}
                      className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors text-neutral-900 dark:text-white"
                      placeholder="Add technology (e.g., React, Node.js)"
                    />
                    <button
                      type="button"
                      onClick={handleAddTechnology}
                      className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {formData.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.technologies.map((tech, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => handleRemoveTechnology(tech)}
                            className="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={projects.creating || projects.updating}
                className="px-6 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={projects.creating || projects.updating}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
              >
                {(projects.creating || projects.updating) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {mode === "edit" ? "Update Project" : "Create Project"}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};