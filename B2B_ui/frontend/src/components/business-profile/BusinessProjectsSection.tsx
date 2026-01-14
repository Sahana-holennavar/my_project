"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Loader2, AlertCircle, Plus, Edit, Trash2, ExternalLink, Calendar, User, Tag } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteBusinessProjectAction, setActiveSectionForm } from "@/store/slices/businessProfileSlice";
import { BusinessProjectForm } from "./BusinessProjectForm";
import type { BusinessProfile } from "@/types/auth";
import type { BusinessProject } from "@/lib/api/businessProfileSections";

interface BusinessProjectsSectionProps {
  businessProfile: BusinessProfile | null;
  delay?: number;
  isLoading?: boolean;
  error?: string | null;
}

export const BusinessProjectsSection = ({ businessProfile, delay = 0.3, isLoading, error }: BusinessProjectsSectionProps) => {
  const dispatch = useAppDispatch();
  const { sections, projects, activeSectionForm, selectedProfile } = useAppSelector((state) => state.businessProfile);
  
  const [editingProject, setEditingProject] = useState<BusinessProject | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const projectsList = sections.projects || [];
  const hasProjects = projectsList.length > 0;
  
  // Check if user is owner or admin to show edit controls
  const canEdit = businessProfile?.role === 'owner' || businessProfile?.role === 'admin';

  // Check if project form should be shown
  const showProjectForm = activeSectionForm === 'projects';

  const handleCreateProject = () => {
    setEditingProject(null);
    dispatch(setActiveSectionForm('projects'));
  };

  const handleEditProject = (project: BusinessProject) => {
    setEditingProject(project);
    dispatch(setActiveSectionForm('projects'));
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!selectedProfile?.profileId) return;
    
    try {
      await dispatch(deleteBusinessProjectAction({
        profileId: selectedProfile.profileId,
        projectId
      })).unwrap();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleCloseForm = () => {
    setEditingProject(null);
    dispatch(setActiveSectionForm(null));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'planning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'on_hold':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
    }
  };

  const formatStatus = (status: string) => {
    return status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified';
  };

  if (!businessProfile) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 sm:p-8 mb-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            Projects {hasProjects && !isLoading && `(${projectsList.length})`}
          </h2>
          {canEdit && (
            <button
              onClick={handleCreateProject}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-500 dark:text-neutral-400">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-neutral-500 dark:text-neutral-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-4" />
              <p>Failed to load projects</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </div>
        ) : !hasProjects ? (
          <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
            <p className="text-lg font-medium mb-2">No projects yet</p>
            <p className="text-sm mb-4">Showcase your business projects and achievements</p>
            {canEdit && (
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Your First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {projectsList.map((project, index) => (
              <motion.div
                key={project.projectId || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + index * 0.1 }}
                className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 hover:shadow-lg transition-shadow relative"
              >

                {/* Project Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white flex-1">
                      {project.title}
                    </h3>
                    {canEdit && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Edit project"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(project.projectId)}
                          disabled={projects.deleting}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Project Details */}
                <div className="space-y-3">
                  {/* Dates */}
                  <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(project.startDate)}
                        {project.endDate && ` - ${formatDate(project.endDate)}`}
                      </span>
                    </div>
                  </div>

                  {/* Status and Client */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {project.status && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {formatStatus(project.status)}
                      </span>
                    )}
                    {project.client && (
                      <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                        <User className="h-4 w-4" />
                        <span>{project.client}</span>
                      </div>
                    )}
                  </div>

                  {/* Technologies */}
                  {project.technologies && (
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-neutral-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(project.technologies) 
                          ? project.technologies 
                          : typeof project.technologies === 'string'
                            ? project.technologies.split(',').map(t => t.trim()).filter(Boolean)
                            : []
                        ).map((tech, techIndex) => (
                          <span
                            key={techIndex}
                            className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project URL */}
                  {project.project_url && (
                    <div className="pt-2">
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Project
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Project Form Modal */}
      <BusinessProjectForm
        isOpen={showProjectForm}
        onClose={handleCloseForm}
        mode={editingProject ? "edit" : "create"}
        projectData={editingProject}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !projects.deleting && setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md mx-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                      Delete Project
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  Are you sure you want to delete this project? All project information will be permanently removed.
                </p>
              </div>
              
              <div className="flex items-center justify-end gap-3 p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={projects.deleting}
                  className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showDeleteConfirm && handleDeleteProject(showDeleteConfirm)}
                  disabled={projects.deleting}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-xl transition-colors disabled:cursor-not-allowed font-medium flex items-center gap-2 min-w-[120px] justify-center"
                >
                  {projects.deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};