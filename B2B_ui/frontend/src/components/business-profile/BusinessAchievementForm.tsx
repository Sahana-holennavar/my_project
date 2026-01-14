"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Save, Plus, Minus, Upload, FileText } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createBusinessAchievementAction, updateBusinessAchievementAction, setActiveSectionForm } from "@/store/slices/businessProfileSlice";
import type { BusinessAchievement } from "@/lib/api/businessProfileSections";

interface BusinessAchievementFormProps {
  isOpen: boolean;
  profileId: string;
  mode?: "create" | "edit";
  achievementData?: BusinessAchievement | null;
  onClose?: () => void;
}

interface AchievementFormData {
  award_name: string;
  awarding_organization: string;
  category: string;
  date_received: string;
  description: string;
  issuer: string;
  icon: string;
  certificateUrl: Array<{ file_url: string }>;
}

const ACHIEVEMENT_CATEGORIES = [
  { value: "", label: "Select Category" },
  { value: "award", label: "Award" },
  { value: "certification", label: "Certification" },
  { value: "recognition", label: "Recognition" },
  { value: "milestone", label: "Milestone" },
  { value: "achievement", label: "Achievement" },
  { value: "other", label: "Other" },
];

const ACHIEVEMENT_ICONS = [
  { value: "trophy", label: "🏆 Trophy" },
  { value: "medal", label: "🏅 Medal" },
  { value: "star", label: "⭐ Star" },
  { value: "certificate", label: "📜 Certificate" },
  { value: "crown", label: "👑 Crown" },
  { value: "ribbon", label: "🎗️ Ribbon" },
];

export const BusinessAchievementForm = ({ isOpen, profileId, mode = "create", achievementData, onClose }: BusinessAchievementFormProps) => {
  const dispatch = useAppDispatch();
  const { achievements } = useAppSelector((state) => state.businessProfile);
  
  const [formData, setFormData] = useState<AchievementFormData>({
    award_name: "",
    awarding_organization: "",
    category: "",
    date_received: "",
    description: "",
    issuer: "",
    icon: "trophy",
    certificateUrl: [],
  });

  const [errors, setErrors] = useState<Partial<AchievementFormData>>({});
  const [newCertificateUrl, setNewCertificateUrl] = useState("");

  useEffect(() => {
    if (mode === "edit" && achievementData) {
      setFormData({
        award_name: achievementData.award_name || "",
        awarding_organization: achievementData.awarding_organization || "",
        category: achievementData.category || "",
        date_received: achievementData.date_received || "",
        description: achievementData.description || "",
        issuer: achievementData.issuer || "",
        icon: achievementData.icon || "trophy",
        certificateUrl: achievementData.certificateUrl || [],
      });
    } else {
      // Reset form for create mode
      setFormData({
        award_name: "",
        awarding_organization: "",
        category: "",
        date_received: "",
        description: "",
        issuer: "",
        icon: "trophy",
        certificateUrl: [],
      });
    }
    setErrors({});
  }, [mode, achievementData, isOpen]);

  const handleInputChange = (field: keyof AchievementFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleAddCertificate = () => {
    if (newCertificateUrl.trim() && isValidUrl(newCertificateUrl)) {
      setFormData(prev => ({
        ...prev,
        certificateUrl: [...prev.certificateUrl, { file_url: newCertificateUrl.trim() }]
      }));
      setNewCertificateUrl("");
    }
  };

  const handleRemoveCertificate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certificateUrl: prev.certificateUrl.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<AchievementFormData> = {};

    if (!formData.award_name.trim()) {
      newErrors.award_name = "Award name is required";
    }

    if (!formData.date_received) {
      newErrors.date_received = "Date received is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
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
    
    if (!validateForm() || !profileId) {
      return;
    }

    try {
      const achievementPayload = {
        ...formData,
        awarding_organization: formData.awarding_organization.trim() || undefined,
        description: formData.description.trim() || undefined,
        issuer: formData.issuer.trim() || undefined,
      };

      if (mode === "edit" && achievementData?.achievementId) {
        await dispatch(updateBusinessAchievementAction({
          profileId: profileId,
          achievementId: achievementData.achievementId,
          achievementData: achievementPayload
        })).unwrap();
      } else {
        await dispatch(createBusinessAchievementAction({
          profileId: profileId,
          achievementData: achievementPayload
        })).unwrap();
      }
      
      handleClose();
    } catch (error) {
      console.error(`Failed to ${mode} achievement:`, error);
    }
  };

  const handleClose = () => {
    dispatch(setActiveSectionForm(null));
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !achievements.creating && !achievements.updating) {
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
              {mode === "edit" ? "Edit Achievement" : "Add New Achievement"}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {mode === "edit" ? "Update achievement details" : "Add a new achievement to your business profile"}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={achievements.creating || achievements.updating}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Award Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Award Name *
            </label>
            <input
              type="text"
              value={formData.award_name}
              onChange={(e) => handleInputChange("award_name", e.target.value)}
              placeholder="e.g., Best Tech Company 2024"
              className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                errors.award_name
                  ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                  : "border-neutral-200 dark:border-neutral-700"
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400`}
              disabled={achievements.creating || achievements.updating}
            />
            {errors.award_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.award_name}</p>
            )}
          </div>

          {/* Row: Category and Icon */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                  errors.category
                    ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                    : "border-neutral-200 dark:border-neutral-700"
                } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
                disabled={achievements.creating || achievements.updating}
              >
                {ACHIEVEMENT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Icon
              </label>
              <select
                value={formData.icon}
                onChange={(e) => handleInputChange("icon", e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                disabled={achievements.creating || achievements.updating}
              >
                {ACHIEVEMENT_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Received */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Date Received *
            </label>
            <input
              type="date"
              value={formData.date_received}
              onChange={(e) => handleInputChange("date_received", e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                errors.date_received
                  ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20"
                  : "border-neutral-200 dark:border-neutral-700"
              } bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white`}
              disabled={achievements.creating || achievements.updating}
            />
            {errors.date_received && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_received}</p>
            )}
          </div>

          {/* Row: Awarding Organization and Issuer */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Awarding Organization
              </label>
              <input
                type="text"
                value={formData.awarding_organization}
                onChange={(e) => handleInputChange("awarding_organization", e.target.value)}
                placeholder="e.g., Tech Industry Association"
                className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
                disabled={achievements.creating || achievements.updating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Issuer
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => handleInputChange("issuer", e.target.value)}
                placeholder="e.g., Tech Industry Association"
                className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
                disabled={achievements.creating || achievements.updating}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the achievement and its significance..."
              rows={4}
              className="w-full px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 resize-none"
              disabled={achievements.creating || achievements.updating}
            />
          </div>

          {/* Certificate URLs */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Certificate URLs
            </label>
            <div className="space-y-3">
              {formData.certificateUrl.map((cert, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <FileText className="h-4 w-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate flex-1">
                    {cert.file_url}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCertificate(index)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500 dark:text-red-400"
                    disabled={achievements.creating || achievements.updating}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newCertificateUrl}
                  onChange={(e) => setNewCertificateUrl(e.target.value)}
                  placeholder="https://example.com/certificate.pdf"
                  className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
                  disabled={achievements.creating || achievements.updating}
                />
                <button
                  type="button"
                  onClick={handleAddCertificate}
                  disabled={!newCertificateUrl.trim() || !isValidUrl(newCertificateUrl) || achievements.creating || achievements.updating}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={achievements.creating || achievements.updating}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 font-medium"
            >
              {(achievements.creating || achievements.updating) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "edit" ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "edit" ? "Update Achievement" : "Create Achievement"}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};