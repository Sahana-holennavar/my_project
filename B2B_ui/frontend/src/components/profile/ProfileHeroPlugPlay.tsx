import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Cropper from 'react-easy-crop';
import getCroppedImg from './utils/cropImage';
// Utility for cropping (utils/cropImage.ts):
// export default async function getCroppedImg(imageSrc, crop, zoom, aspect) { ... }
import { Camera, Edit3, MapPin, ExternalLink, MoreHorizontal, Share2, X, Settings, Copy, Check, Facebook, Twitter, Linkedin, Mail, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Area } from 'react-easy-crop';
// Modal animation variants
import type { Variants, Transition } from 'framer-motion';
import { uploadProfileImage, updateHeroSection } from '@/lib/api/profile';
import { checkPendingRequestFromUser, acceptConnectionRequest, rejectConnectionRequest } from '@/lib/api/connections';
import ResumeDragDropModal from './ResumeDragDropModal';
import type { ProfileImageUploadResponse, PersonalInformation, About } from '@/lib/api/profile';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { assignRole } from '@/store/slices/authSlice';
import RoleSwitchModal from './RoleSwitchModal';
import { Toast, useToast } from '@/components/ui/toast';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Loader2 } from 'lucide-react';
const modalBackdropVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalContentVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as Transition['type'], damping: 25, stiffness: 200 } },
  exit: { opacity: 0, y: -50 }
};

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
  'B.Tech / B.E',
  'M.Tech',
  'B.Sc',
  'M.Sc',
  'BCA',
  'MCA',
  'Other',
];

type EditIntroModalProps = {
  isOpen: boolean;
  onClose: () => void;
  introData: Partial<PersonalInformation>;
  onSave: (data: Partial<PersonalInformation>) => void;
};

const EditIntroModal = ({ isOpen, onClose, introData, onSave }: EditIntroModalProps) => {
  const user = useAppSelector((state) => state.auth.user);
  const professionOptions = useMemo(
    () => (user?.role === 'student' ? STUDENT_PROFESSION_OPTIONS : PROFESSIONAL_PROFESSION_OPTIONS),
    [user?.role]
  );

  const hasBuiltInOtherOption = useMemo(() => professionOptions.includes('Other'), [professionOptions]);
  // Initialize formData with user email instead of introData email
  const [formData, setFormData] = useState<Partial<PersonalInformation>>({
    ...introData,
    email: user?.email || introData.email || '',
  });
  // Track if "Other" profession is selected
  const [isOtherProfessionSelected, setIsOtherProfessionSelected] = useState(false);
  
  // Update form data when introData changes, but always keep email from user
  useEffect(() => { 
    setFormData(prev => ({
      ...introData,
      email: user?.email || prev.email || '',
    }));
    // Check if profession is "Other" (custom profession)
    if (introData.profession && !professionOptions.includes(introData.profession)) {
      setIsOtherProfessionSelected(true);
    } else {
      setIsOtherProfessionSelected(false);
    }
  }, [introData, user?.email, professionOptions]);
  
  // Always ensure email is from Redux store (override any profile email)
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
    // Prevent changing email field
    if (e.target.name === 'email') return;
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
  };
  const handleSubmit = (e: React.FormEvent) => { 
    e.preventDefault(); 
    onSave(formData); 
    onClose(); 
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          variants={modalBackdropVariants} 
          initial="hidden" 
          animate="visible" 
          exit="hidden" 
          onClick={onClose} 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            variants={modalContentVariants} 
            onClick={(e: React.MouseEvent) => e.stopPropagation()} 
            className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl shadow-xl transition-colors max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-neutral-900 z-10 pb-4">
                <h2 className="text-2xl font-bold text-brand-gray-900 dark:text-white">Edit Personal Information</h2>
                <button 
                  className="p-2 text-brand-gray-400 dark:text-neutral-500 hover:text-brand-gray-900 dark:hover:text-white" 
                  onClick={onClose}
                >
                  <X size={22}/>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: First Name | Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="first_name" 
                      value={formData.first_name} 
                      onChange={handleChange}
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="last_name" 
                      value={formData.last_name} 
                      onChange={handleChange}
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Row 2: Email | Phone Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email || ''} 
                      onChange={handleChange}
                      disabled
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Phone Number
                    </label>
                    <PhoneInput
                      value={formData.phone_number || undefined}
                      onChange={(value) => {
                        const syntheticEvent = {
                          target: { name: 'phone_number', value: value || '' }
                        } as React.ChangeEvent<HTMLInputElement>;
                        handleChange(syntheticEvent);
                      }}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                {/* Row 3: Date of Birth | Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Date of Birth
                    </label>
                    <input 
                      type="date" 
                      name="date_of_birth" 
                      value={formData.date_of_birth || ''} 
                      onChange={handleChange}
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Gender
                    </label>
                    <select 
                      name="gender" 
                      value={formData.gender || ''} 
                      onChange={handleChange}
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Profession/Education | Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      {user?.role === 'student' ? 'Education' : 'Profession'} <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="profession" 
                      value={
                        formData.profession && !professionOptions.includes(formData.profession)
                          ? "Other"
                          : (formData.profession || '')
                      }
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        if (selectedValue === "Other") {
                          setIsOtherProfessionSelected(true);
                          // When "Other" is selected, keep existing custom value if it exists
                          const existingCustomValue = formData.profession && !professionOptions.includes(formData.profession) 
                            ? formData.profession 
                            : '';
                          // Only update if we have an existing custom value, otherwise leave it for user to type
                          if (existingCustomValue) {
                            handleChange({
                              target: { name: 'profession', value: existingCustomValue }
                            } as React.ChangeEvent<HTMLInputElement>);
                          } else {
                            // Don't clear profession, let user type in the input
                            if (!formData.profession) {
                              handleChange({
                                target: { name: 'profession', value: '' }
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }
                        } else {
                          setIsOtherProfessionSelected(false);
                          handleChange({
                            target: { name: 'profession', value: selectedValue }
                          } as React.ChangeEvent<HTMLInputElement>);
                        }
                      }}
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="">{user?.role === 'student' ? 'Select Education' : 'Select Profession'}</option>
                      {professionOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                      {!hasBuiltInOtherOption && <option value="Other">Other</option>}
                    </select>
                    
                    {/* Show custom profession input when "Other" is selected */}
                    {(isOtherProfessionSelected || (formData.profession && !professionOptions.includes(formData.profession))) && (
                      <div className="mt-2">
                        <input
                          type="text"
                          name="profession"
                          value={formData.profession || ""}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 100); // Max 100 characters
                            handleChange({
                              target: { name: 'profession', value }
                            } as React.ChangeEvent<HTMLInputElement>);
                          }}
                          placeholder={user?.role === 'student' ? 'Enter your education (max 100 characters)' : 'Enter your profession (max 100 characters)'}
                          maxLength={100}
                          className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-neutral-500 mt-1">
                          {(formData.profession || "").length}/100 characters
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="country" 
                      value={formData.country} 
                      onChange={handleChange}
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="India"
                    />
                  </div>
                </div>

                {/* Row 6: State/Province | City */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      State/Province <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="state_province" 
                      value={formData.state_province} 
                      onChange={handleChange}
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-1 block">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="city" 
                      value={formData.city} 
                      onChange={handleChange}
                      required
                      className="w-full bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg p-3 text-brand-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Pune"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-brand-gray-200 dark:border-neutral-800">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold rounded-full bg-brand-gray-100 dark:bg-neutral-800 text-brand-gray-700 dark:text-neutral-300 hover:bg-brand-gray-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-sm font-semibold rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



type ButtonProps = {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  [x: string]: unknown;
};
const Button = ({ className = '', children, variant = 'primary', ...props }: ButtonProps) => {
  const baseStyle = "px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20",
    secondary: "!bg-white !text-neutral-800 dark:!bg-neutral-800 dark:!text-white hover:!bg-neutral-100 dark:hover:!bg-neutral-700 border border-neutral-300 dark:border-neutral-700 transition-colors",
    ghost: "bg-black/40 hover:bg-black/60 text-white",
  };
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

type AvatarProps = {
  src: string;
  alt: string;
  fallback: string;
  className?: string;
};
const Avatar = ({ src, alt, fallback, className }: AvatarProps) => {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [src]);
  return (
    <div className={`relative rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center overflow-hidden shrink-0 ${className || 'w-16 h-16'}`}>
      {!imgError && src && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {(imgError || !src) && (
        <span className="font-semibold uppercase tracking-wide text-2xl">{fallback}</span>
      )}
    </div>
  );
};

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase());
  return parts.join('') || name.charAt(0).toUpperCase();
};

// Share Modal Component
type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profileUrl: string;
  onCopySuccess: () => void;
};

const ShareModal = ({ isOpen, onClose, profileName, profileUrl, onCopySuccess }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      onCopySuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareVia = (platform: string) => {
    const encodedUrl = encodeURIComponent(profileUrl);
    const encodedText = encodeURIComponent(`Check out ${profileName}'s profile`);
    
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={modalBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-brand-gray-900 dark:text-white">
                Share Profile
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-brand-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
              >
                <X size={20} className="text-brand-gray-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Copy Link Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-2">
                Profile Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-brand-gray-50 dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-lg text-sm text-brand-gray-900 dark:text-white"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copied ? (
                    <Check size={18} />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Options */}
            <div>
              <label className="block text-sm font-medium text-brand-gray-700 dark:text-neutral-300 mb-3">
                Share via
              </label>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => shareVia('facebook')}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-brand-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Facebook size={20} className="text-white" fill="white" />
                  </div>
                  <span className="text-xs text-brand-gray-600 dark:text-neutral-400">Facebook</span>
                </button>

                <button
                  onClick={() => shareVia('twitter')}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-brand-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
                >
                  <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Twitter size={20} className="text-white" fill="white" />
                  </div>
                  <span className="text-xs text-brand-gray-600 dark:text-neutral-400">Twitter</span>
                </button>

                <button
                  onClick={() => shareVia('linkedin')}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-brand-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Linkedin size={20} className="text-white" fill="white" />
                  </div>
                  <span className="text-xs text-brand-gray-600 dark:text-neutral-400">LinkedIn</span>
                </button>

                <button
                  onClick={() => shareVia('email')}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-brand-gray-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
                >
                  <div className="w-12 h-12 bg-neutral-600 dark:bg-neutral-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail size={20} className="text-white" />
                  </div>
                  <span className="text-xs text-brand-gray-600 dark:text-neutral-400">Email</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Props:
// profileData: { name, headline, location, avatarUrl, coverUrl }
// isSelfProfile: boolean (true = show edit/camera, false = show follow/share)
// onEdit: function (edit intro/details)
// onAvatarUpload: function (file)
// onCoverUpload: function (file)
// onShare: function ()
// onFollow: function ()
// onAddSection: function ()
// onOpenToWork: function ()


type ProfileData = {
  name: string;
  headline: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
};

type ProfileHeroPlugPlayProps = {
  profileData: ProfileData;
  personalInfo?: Partial<PersonalInformation>;
  aboutData?: Partial<About>;
  currentStatus?: string;
  isSelfProfile?: boolean;
  onEdit?: () => void;
  onAvatarUpload?: (file: File) => void;
  onCoverUpload?: (file: File) => void;
  onShare?: () => void;
  onFollow?: () => void;
  onAddSection?: () => void;
  onMore?: () => void;
  onProfileRefresh?: () => void;
  resumeUrl?: string | null;
  userId?: string; // The user ID being viewed
  connectionStatus?: 'none' | 'pending' | 'connected'; // Connection status
  onDisconnect?: () => void; // Callback when removing connection
  onWithdraw?: () => void; // Callback when withdrawing pending connection request
};

const ProfileHeroPlugPlay = ({
  profileData,
  personalInfo,
  aboutData,
  currentStatus,
  isSelfProfile = false,
  onAvatarUpload,
  onCoverUpload,
  onShare,
  onFollow,
  onAddSection,
  onMore = () => {},
  onProfileRefresh,
  resumeUrl: resumeUrlProp = null,
  userId,
  connectionStatus = 'none',
  onDisconnect,
  onWithdraw,
}: ProfileHeroPlugPlayProps & { onProfileDataChange?: (data: Record<string, unknown>) => void }) => {
  const router = useRouter();
  const avatarUploadRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  
  // Pending request state
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState<Record<string, unknown> | null>(null);
  const [checkingPendingRequest, setCheckingPendingRequest] = useState(false);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const resolveProfession = (info?: Partial<PersonalInformation>, about?: Partial<About>) => {
    return info?.profession || about?.industry || '';
  };

  const [personalInfoState, setPersonalInfoState] = useState<Partial<PersonalInformation>>({
    ...personalInfo,
    profession: resolveProfession(personalInfo, aboutData),
  });
  const [aboutState, setAboutState] = useState<Partial<About>>(aboutData || {});

  useEffect(() => {
    if (personalInfo) {
      setPersonalInfoState(prev => ({
        ...personalInfo,
        profession: resolveProfession(personalInfo, aboutState) || prev.profession,
      }));
    }
  }, [personalInfo, aboutState]);

  useEffect(() => {
    if (aboutData) {
      setAboutState(aboutData);
    }
  }, [aboutData]);
  
  // Resume modal state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(resumeUrlProp || null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Sync resumeUrl state with prop changes
  useEffect(() => {
    if (resumeUrlProp) {
      setResumeUrl(resumeUrlProp);
    }
  }, [resumeUrlProp]);
  
  // Check for pending connection request from viewed user
  useEffect(() => {
    if (!isSelfProfile && userId) {
      const checkPendingRequest = async () => {
        setCheckingPendingRequest(true);
        try {
          const response = await checkPendingRequestFromUser(userId);
          if (response.success) {
            setHasPendingRequest(response.hasPendingRequest);
            if (response.requestData) {
              setPendingRequestData(response.requestData);
            }
          }
        } catch (error) {
          console.error('Failed to check pending request:', error);
        } finally {
          setCheckingPendingRequest(false);
        }
      };
      
      checkPendingRequest();
    }
  }, [isSelfProfile, userId]);
  
  // Handle accepting pending request
  const handleAcceptPendingRequest = async () => {
    if (!pendingRequestData?.sender_id) return;
    
    setAcceptingRequest(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await acceptConnectionRequest((pendingRequestData as any).sender_id);
      if (response.success) {
        showToast('Connection request accepted!', 'success');
        setHasPendingRequest(false);
        setPendingRequestData(null);
        // Refresh profile data
        if (onProfileRefresh) {
          setTimeout(() => onProfileRefresh(), 500);
        }
      } else {
        showToast(response.message || 'Failed to accept request', 'error');
      }
    } catch (error) {
      showToast('Failed to accept request', 'error');
    } finally {
      setAcceptingRequest(false);
    }
  };
  
  // Handle rejecting pending request
  const handleRejectPendingRequest = async () => {
    if (!pendingRequestData?.sender_id) return;
    
    setRejectingRequest(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await rejectConnectionRequest((pendingRequestData as any).sender_id);
      if (response.success) {
        showToast('Connection request declined', 'info');
        setHasPendingRequest(false);
        setPendingRequestData(null);
        // Refresh profile data
        if (onProfileRefresh) {
          setTimeout(() => onProfileRefresh(), 500);
        }
      } else {
        showToast(response.message || 'Failed to decline request', 'error');
      }
    } catch (error) {
      showToast('Failed to decline request', 'error');
    } finally {
      setRejectingRequest(false);
    }
  };
  
  
  const [cropModal, setCropModal] = useState<{ type: 'avatar' | 'cover', file: File, url: string } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  // For UI feedback
  const [isCropping, setIsCropping] = useState(false);
  const [showWorkStatus, setShowWorkStatus] = useState(false);
  const [workStatus, setWorkStatus] = useState<string | null>(currentStatus || null);
  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Uploading...');
  
  // Remove avatar/banner states
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<{ type: 'avatar' | 'banner' | null }>({ type: null });
  const [isRemoving, setIsRemoving] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [bannerHover, setBannerHover] = useState(false);
  
  // Get user from Redux store
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const userRole = user?.role || 'student';
  
  // Role-based status options
  const studentStatuses = ['Studying', 'Looking for internship', 'Looking for job'];
  const studentProfessions = ['B.Tech / B.E', 'M.Tech', 'B.Sc', 'M.Sc', 'BCA', 'MCA', 'Others'];
  const professionalStatuses = ['Employed', 'Unemployed', 'Freelancing', 'Consulting', 'Employer'];
  
  // Role switch modal state
  const [showRoleSwitchModal, setShowRoleSwitchModal] = useState(false);
  const [attemptedStatus, setAttemptedStatus] = useState<string | null>(null);

  // Helper function to remove undefined values from object
  const removeUndefinedValues = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        (acc as Record<string, unknown>)[key] = value;
      }
      return acc;
    }, {} as Partial<T>);
  };

  // Handler for removing avatar
  const handleRemoveAvatar = async () => {
    if (!user?.id) return
    
    setIsRemoving(true)
    setLoadingMessage('Removing avatar...')
    setUploadError(null)
    
    // Optimistic update: clear avatar preview immediately
    const previousAvatar = avatarPreview || profileData.avatarUrl
    setAvatarPreview(null)
    
    try {
      const tokens = await import('@/lib/tokens').then(m => m.tokenStorage.getStoredTokens())
      if (!tokens?.access_token) {
        throw new Error('Authentication required')
      }
      
      const { env } = await import('@/lib/env')
      const response = await fetch(`${env.API_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      
      if (!response.ok) {
        // Handle 404/501 gracefully
        if (response.status === 404 || response.status === 501) {
          throw new Error('Remove avatar currently unavailable, try again later')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to remove avatar')
      }
      
      const data = await response.json()
      
      // Update profile state - avatar should be null now
      if (onProfileRefresh) {
        setTimeout(() => onProfileRefresh(), 500)
      }
      
      showToast('Avatar removed successfully', 'success')
      setShowRemoveConfirm({ type: null })
    } catch (error) {
      // Revert optimistic update on error
      setAvatarPreview(previousAvatar)
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove avatar'
      setUploadError(errorMsg)
      showToast(errorMsg, 'error')
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsRemoving(false)
      setShowRemoveConfirm({ type: null })
    }
  }
  
  // Handler for removing banner
  const handleRemoveBanner = async () => {
    if (!user?.id) return
    
    setIsRemoving(true)
    setLoadingMessage('Removing banner...')
    setUploadError(null)
    
    // Optimistic update: set to default banner immediately
    const previousBanner = coverPreview || profileData.coverUrl
    const defaultBannerUrl = '/assets/default-banner.jpg'
    setCoverPreview(defaultBannerUrl)
    
    try {
      const tokens = await import('@/lib/tokens').then(m => m.tokenStorage.getStoredTokens())
      if (!tokens?.access_token) {
        throw new Error('Authentication required')
      }
      
      const { env } = await import('@/lib/env')
      const response = await fetch(`${env.API_URL}/profile/banner`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      
      if (!response.ok) {
        // Handle 404/501 gracefully
        if (response.status === 404 || response.status === 501) {
          throw new Error('Remove banner currently unavailable, try again later')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to remove banner')
      }
      
      const data = await response.json()
      
      // Update to default banner URL from backend or fallback
      const bannerUrl = data.data?.defaultBannerUrl || defaultBannerUrl
      setCoverPreview(bannerUrl)
      
      // Update profile state
      if (onProfileRefresh) {
        setTimeout(() => onProfileRefresh(), 500)
      }
      
      showToast('Banner removed successfully', 'success')
      setShowRemoveConfirm({ type: null })
    } catch (error) {
      // Revert optimistic update on error
      setCoverPreview(previousBanner)
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove banner'
      setUploadError(errorMsg)
      showToast(errorMsg, 'error')
      setTimeout(() => setUploadError(null), 5000)
    } finally {
      setIsRemoving(false)
      setShowRemoveConfirm({ type: null })
    }
  }
  
  // Handler for saving personal information
  const handleSavePersonalInfo = async (updatedInfo: Partial<PersonalInformation>) => {
    if (!user?.id) return;
    
    try {
      setLoadingMessage('Updating personal information...');
      setIsUploading(true);
      setUploadError(null);
      
      let hasUpdated = false;

      const cleanPersonalInfo = removeUndefinedValues(updatedInfo);
      if (Object.keys(cleanPersonalInfo).length > 0) {
        await updateHeroSection(user.id, {
          personal_information: cleanPersonalInfo,
        });
        hasUpdated = true;
        setPersonalInfoState(prev => ({ ...prev, ...cleanPersonalInfo }));
      }

      if (updatedInfo.profession) {
        const mergedAbout = removeUndefinedValues({
          ...aboutState,
          industry: updatedInfo.profession as About['industry'],
        });

        if (Object.keys(mergedAbout).length > 0) {
          await updateHeroSection(user.id, {
            about: mergedAbout,
          });
          hasUpdated = true;
          setAboutState(prev => ({ ...prev, industry: updatedInfo.profession as About['industry'] }));
        }
      }
      
      if (hasUpdated) {
        setUploadSuccess('Personal information updated successfully!');
        
        if (onProfileRefresh) {
          setTimeout(() => onProfileRefresh(), 500);
        }
        
        setTimeout(() => setUploadSuccess(null), 3000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update personal information';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handler for status selection with role validation
  const handleStatusClick = async (status: string) => {
    const isStudentStatus = studentStatuses.includes(status);
    const isProfessionalStatus = professionalStatuses.includes(status);
    
    // Check if user is trying to select status from other role
    if (userRole === 'student' && isProfessionalStatus) {
      setAttemptedStatus(status);
      setShowRoleSwitchModal(true);
      setShowWorkStatus(false);
      return;
    }
    
    if (userRole === 'professional' && isStudentStatus) {
      setAttemptedStatus(status);
      setShowRoleSwitchModal(true);
      setShowWorkStatus(false);
      return;
    }
    
    // If status is for correct role, update it via API
    if (!user?.id) return;
    
    try {
      setLoadingMessage('Updating status...');
      setIsUploading(true);
      setUploadError(null);
      
      // Send complete about section with updated status (remove undefined values)
      const cleanAboutData = removeUndefinedValues({
        ...aboutState,
        current_status: status as About['current_status'],
      });
      
      await updateHeroSection(user.id, {
        about: cleanAboutData,
      });
      
      setWorkStatus(status);
      setAboutState(prev => ({ ...prev, current_status: status as About['current_status'] }));
      setShowWorkStatus(false);
      setUploadSuccess('Status updated successfully!');
      
      // Refresh profile data
      if (onProfileRefresh) {
        setTimeout(() => onProfileRefresh(), 500);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update status';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handler for role switch
  const handleRoleSwitch = async () => {
    const targetRole = userRole === 'student' ? 'professional' : 'student';
    
    try {
      setLoadingMessage('Switching role...');
      setIsUploading(true);
      setUploadError(null);
      
      // Call Redux action to assign new role
      await dispatch(assignRole(targetRole)).unwrap();
      
      setUploadSuccess(`Role switched to ${targetRole} successfully!`);
      
      // If user had attempted to select a status, update it after role switch
      if (attemptedStatus && user?.id) {
        setLoadingMessage('Updating status...');
        
        try {
          // Send complete about section with updated status (remove undefined values)
          const cleanAboutData = removeUndefinedValues({
            ...aboutState,
            current_status: attemptedStatus as About['current_status'],
          });
          
          await updateHeroSection(user.id, {
            about: cleanAboutData,
          });
          
          setWorkStatus(attemptedStatus);
          setAboutState(prev => ({ ...prev, current_status: attemptedStatus as About['current_status'] }));
          setUploadSuccess('Role switched and status updated successfully!');
          
          // Refresh profile data to reflect both changes
          if (onProfileRefresh) {
            setTimeout(() => onProfileRefresh(), 500);
          }
        } catch (error) {
          console.error('Failed to update status after role switch:', error);
          setUploadError('Role switched but failed to update status');
          setTimeout(() => setUploadError(null), 5000);
        }
      } else {
        // If no status to update, just refresh profile
        if (onProfileRefresh) {
          setTimeout(() => onProfileRefresh(), 500);
        }
      }
      
      // Clear attempted status and close modal
      setAttemptedStatus(null);
      setShowRoleSwitchModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to switch role';
      setUploadError(errorMsg);
      setTimeout(() => setUploadError(null), 5000);
      setShowRoleSwitchModal(false);
      setAttemptedStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up blob URLs when they change or component unmounts
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [avatarPreview, coverPreview]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropModal({ type: 'avatar', file, url });
    }
  };
  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropModal({ type: 'cover', file, url });
    }
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // In handleCropSave, check for null before using croppedAreaPixels
  const handleCropSave = async () => {
    if (!cropModal || !croppedAreaPixels) return;
    setIsCropping(true);
    setUploadError(null);
    setUploadSuccess(null);
    
    try {
      const croppedImage = await getCroppedImg(
        cropModal.url,
        croppedAreaPixels,
        zoom,
        cropModal.type === 'avatar' ? 1 : 1200 / 300,
        brightness
      );
      
      // Convert blob URL to File object for upload
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const fileName = `${cropModal.type}_${Date.now()}.${blob.type.split('/')[1]}`;
      const croppedFile = new File([blob], fileName, { type: blob.type });
      
      if (cropModal.type === 'avatar') {
        setAvatarPreview(croppedImage);
        
        // Upload the cropped image to server using 'avatar' endpoint
        setLoadingMessage('Uploading avatar...');
        setIsUploading(true);
        const uploadResult: ProfileImageUploadResponse = await uploadProfileImage(croppedFile, 'avatar');
        setIsUploading(false);
        
        if (uploadResult.success && uploadResult.data) {
          // Show success message
          setUploadSuccess(`Avatar uploaded successfully!`);
          
          // Update avatar with the received URL from server
          // Handle the new response structure: data.avatar.fileUrl
          const avatarUrl = uploadResult.data.avatar?.fileUrl || 
                           uploadResult.data.avatar_url || 
                           uploadResult.data.profile_image_url;
          if (avatarUrl) {
            setAvatarPreview(avatarUrl);
          }
          
          // Log the received data for debugging
          // Clear success message after 3 seconds
          setTimeout(() => setUploadSuccess(null), 3000);
          
          // Dispatch tutorial action completed event for avatar upload
          window.dispatchEvent(new CustomEvent('tutorial-action-completed', {
            detail: { step: 2, action: 'avatar-uploaded' }
          }));
          
          // Call the original callback if provided
          if (onAvatarUpload) onAvatarUpload(croppedFile);
          
          // Refresh profile data to get updated avatar from backend
          if (onProfileRefresh) {
            setTimeout(() => onProfileRefresh(), 500);
          }
        } else {
          // Handle upload error
          const errorMessage = uploadResult.errors && uploadResult.errors.length > 0
            ? uploadResult.errors[0].message
            : uploadResult.message;
          setUploadError(errorMessage);
          
          // Clear error after 5 seconds
          setTimeout(() => setUploadError(null), 5000);
        }
      } else {
        // Cover/Banner upload
        setCoverPreview(croppedImage);
        
        // Upload the cropped banner to server using 'banner' endpoint
        setLoadingMessage('Uploading banner...');
        setIsUploading(true);
        const uploadResult: ProfileImageUploadResponse = await uploadProfileImage(croppedFile, 'banner');
        setIsUploading(false);
        
        if (uploadResult.success && uploadResult.data) {
          // Show success message
          setUploadSuccess(`Banner uploaded successfully!`);
          
          // Update cover with the received URL from server
          // Handle the new response structure: data.banner.fileUrl
          const bannerUrl = uploadResult.data.banner?.fileUrl || 
                           uploadResult.data.banner_url || 
                           uploadResult.data.profile_image_url;
          if (bannerUrl) {
            setCoverPreview(bannerUrl);
          }
          
          // Clear success message after 3 seconds
          setTimeout(() => setUploadSuccess(null), 3000);
          
          // Dispatch tutorial action completed event for banner upload
          window.dispatchEvent(new CustomEvent('tutorial-action-completed', {
            detail: { step: 3, action: 'banner-uploaded' }
          }));
          
          // Call the original callback if provided
          if (onCoverUpload) onCoverUpload(croppedFile);
          
          // Refresh profile data to get updated banner from backend
          if (onProfileRefresh) {
            setTimeout(() => onProfileRefresh(), 500);
          }
        } else {
          // Handle upload error
          const errorMessage = uploadResult.errors && uploadResult.errors.length > 0
            ? uploadResult.errors[0].message
            : uploadResult.message;
          setUploadError(errorMessage);
          
          // Clear error after 5 seconds
          setTimeout(() => setUploadError(null), 5000);
        }
      }
    } catch {
      setIsUploading(false);
      const errorMsg = 'Failed to crop image. Please try again.';
      setUploadError(errorMsg);
    showToast(errorMsg, 'error');
    }
    setIsCropping(false);
    setCropModal(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setBrightness(100);
  };

  const handleCropCancel = () => {
    if (cropModal) URL.revokeObjectURL(cropModal.url);
    setCropModal(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setBrightness(100);
  };
  const handleMoreClick = () => setShowMore((v) => !v);
  const handleMoreAction = async (action: string) => {
    setShowMore(false);
    if (onMore) onMore();
    
    // Handle different actions
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Profile link copied to clipboard!', 'success');
      } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link', 'error');
      }
    }
    
    if (action === 'share') {
      // Use native share API if available (mobile)
      if (navigator.share) {
        try {
          await navigator.share({
            title: profileData.name,
            text: `Check out ${profileData.name}'s profile`,
            url: window.location.href,
          });
        } catch (err) {
          // User cancelled or error occurred
          if ((err as Error).name !== 'AbortError') {
            // Fallback to copy
            try {
              await navigator.clipboard.writeText(window.location.href);
              showToast('Profile link copied to clipboard!', 'success');
            } catch (copyErr) {
              showToast('Failed to share or copy link', 'error');
            }
          }
        }
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Profile link copied to clipboard!', 'success');
        } catch (err) {
          console.error('Failed to copy:', err);
          showToast('Failed to copy link', 'error');
        }
      }
    }
  };

  return (
    <>
      {/* Upload Status Notifications */}
      <AnimatePresence>
        {(uploadSuccess || uploadError || isUploading) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[60] max-w-md"
          >
            {isUploading && (
              <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span className="font-medium">{loadingMessage}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{uploadSuccess}</span>
              </div>
            )}
            {uploadError && (
              <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Upload Failed</p>
                  <p className="text-sm mt-1 opacity-90">{uploadError}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-3xl shadow-lg transition-colors">
        {/* Crop Modal */}
        <AnimatePresence>
          {cropModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
              <motion.div initial={{ scale: 0.97 }} animate={{ scale: 1 }} exit={{ scale: 0.97 }} className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-0 w-full max-w-xl flex flex-col items-center transition-colors">
                <div className="w-full flex flex-col items-center p-6">
                  <h2 className="text-lg font-bold text-brand-gray-900 dark:text-white mb-4">Adjust Image</h2>
                  <div className="w-full h-72 relative bg-brand-gray-100 dark:bg-black rounded-xl overflow-hidden transition-colors">
                    <Cropper
                      image={cropModal.url}
                      crop={crop}
                      zoom={zoom}
                      aspect={cropModal.type === 'avatar' ? 1 : 1200/300}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      cropShape={cropModal.type === 'avatar' ? 'round' : 'rect'}
                      style={{ containerStyle: { filter: `brightness(${brightness}%)` } }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 w-full mt-6">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-brand-gray-500 dark:text-neutral-400 w-20">Zoom</label>
                      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-purple-500" />
                      <span className="text-xs text-brand-gray-500 dark:text-neutral-400 w-8 text-right">{zoom.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-brand-gray-500 dark:text-neutral-400 w-20">Brightness</label>
                      <input type="range" min={50} max={200} step={1} value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="flex-1 accent-purple-500" />
                      <span className="text-xs text-brand-gray-500 dark:text-neutral-400 w-8 text-right">{brightness}%</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 w-full mt-8">
                    <Button variant="secondary" onClick={handleCropCancel} disabled={isCropping || isUploading}>Cancel</Button>
                    <Button variant="primary" onClick={handleCropSave} disabled={isCropping || isUploading}>
                      {isCropping ? 'Cropping...' : isUploading ? 'Uploading...' : 'Crop & Save'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Hidden File Inputs for Upload */}
        <input type="file" accept="image/*" ref={coverUploadRef} onChange={handleCoverUpload} className="hidden" />
        <input type="file" accept="image/*" ref={avatarUploadRef} onChange={handleAvatarUpload} className="hidden" />

        {/* Cover Image */}
        <div 
          data-tour="banner-upload"
          className={`relative h-40 sm:h-52 md:h-64 overflow-hidden rounded-t-3xl ${isSelfProfile ? 'group' : ''}`}
          onMouseEnter={() => isSelfProfile && setBannerHover(true)}
          onMouseLeave={() => isSelfProfile && setBannerHover(false)}
        >
          {/* Default banner logic: Use industry/profession-based image, fallback to gradient */}
          {(() => {
            // Map of industry/profession to public image filenames
            // Robust industry/profession to image mapping
            const industryImageMap: Record<string, string> = {
              'technology': 'it industry.png',
              'it industry': 'it industry.png',
              'healthcare': 'healthandcare.png',
              'finance': 'finance.png',
              'education': 'education.png',
              'biotechnology': 'Biotechnology.png',
              'manufacturing': 'automation.png',
              'industrial automation': 'automation.png',
              'r&d': 'Research and Development.png',
              'research and development': 'Research and Development.png',
              'human resource': 'Human Resource.jpg',
              'construction': 'constuction.png',
              'architecture': 'Architechture.png',
              'interior design': 'Interior Design.png',
              'design engineer': 'engineering.png',
              'engineering': 'engineering.png',
              'other': 'engineering.png',
              'b.tech / b.e': 'engineering.png',
              'm.tech': 'engineering.png',
              'b.sc': 'engineering.png',
              'm.sc': 'engineering.png',
              'bca': 'engineering.png',
              'mca': 'engineering.png',
            };
            // Determine which field to use for banner selection
            let bannerKey = '';
            if (userRole === 'student') {
              bannerKey = personalInfoState?.profession || '';
            } else {
              bannerKey = aboutState?.industry || personalInfoState?.profession || '';
            }
            // Normalize input for matching
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const industryNorm = normalize(bannerKey);
            // Try to find a matching image (exact, then partial, then fallback)
            let defaultBannerImg = '';
            if (industryNorm && industryImageMap[industryNorm]) {
              defaultBannerImg = `/${industryImageMap[industryNorm]}`;
            } else {
              // Try loose/partial match
              const found = Object.keys(industryImageMap).find(key => industryNorm.includes(normalize(key)));
              if (found) defaultBannerImg = `/${industryImageMap[found]}`;
            }
            // Fallback to generic
            if (!defaultBannerImg) {
              // Check if engineering.png exists, else fallback to logo.png
              const img = new window.Image();
              img.src = '/engineering.png';
              img.onload = () => {};
              img.onerror = () => {
                defaultBannerImg = '/logo.png';
              };
              defaultBannerImg = '/engineering.png';
            }
            
            // Check if profileData.coverUrl is a placeholder/default (unsplash, default-banner, etc.)
            const isPlaceholderBanner = (url: string) => {
              if (!url) return true;
              const lowerUrl = url.toLowerCase();
              return lowerUrl.includes('unsplash') || 
                     lowerUrl.includes('placeholder') || 
                     lowerUrl.includes('default-banner') ||
                     lowerUrl.includes('picsum.photos');
            };
            
            // Use coverPreview if available (user just uploaded), 
            // or use profileData.coverUrl only if it's NOT a placeholder
            // Otherwise use industry-based default banner
            let currentBannerUrl = coverPreview;
            if (!currentBannerUrl && profileData.coverUrl && !isPlaceholderBanner(profileData.coverUrl)) {
              currentBannerUrl = profileData.coverUrl;
            }
            
            // If no banner, use defaultBannerImg, else use uploaded
            if (!currentBannerUrl) {
              return (
                <img
                  src={defaultBannerImg}
                  alt="Default Banner"
                  className="w-full h-full object-cover bg-brand-gray-100 dark:bg-neutral-900 transition-colors"
                  onError={(e) => {
                    console.error('[BANNER ERROR] Failed to load default banner:', defaultBannerImg);
                    // If image fails to load, show solid background (no gradient)
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'w-full h-full bg-brand-gray-200 dark:bg-neutral-800';
                    target.parentElement?.appendChild(fallbackDiv);
                  }}
                />
              );
            } else {
              return (
                <img
                  src={currentBannerUrl}
                  alt="Cover"
                  className="w-full h-full object-cover bg-brand-gray-100 dark:bg-neutral-900 transition-colors"
                  onError={(e) => {
                    console.error('[BANNER ERROR] Failed to load custom banner:', currentBannerUrl, '- trying default:', defaultBannerImg);
                    // If image fails to load, fallback to industry/profession default
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallbackImg = document.createElement('img');
                    fallbackImg.src = defaultBannerImg;
                    fallbackImg.alt = 'Default Banner';
                    fallbackImg.className = 'w-full h-full object-cover bg-brand-gray-100 dark:bg-neutral-900 transition-colors';
                    fallbackImg.onerror = () => {
                      console.error('[BANNER ERROR] Fallback also failed:', defaultBannerImg);
                      // Final fallback: solid background (no gradient)
                      fallbackImg.style.display = 'none';
                      const fallbackDiv = document.createElement('div');
                      fallbackDiv.className = 'w-full h-full bg-brand-gray-200 dark:bg-neutral-800';
                      fallbackImg.parentElement?.appendChild(fallbackDiv);
                    };
                    target.parentElement?.appendChild(fallbackImg);
                  }}
                />
              );
            }
          })()}
          {isSelfProfile && bannerHover && (
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="ghost" 
                className="p-2.5 h-auto rounded-lg transition-opacity" 
                onClick={() => coverUploadRef.current && coverUploadRef.current.click()}
                title="Change banner"
              >
                <Camera size={20} />
              </Button>
              {coverPreview || profileData.coverUrl ? (
                <Button
                  data-tour="banner-delete"
                  variant="ghost"
                  className="p-2.5 h-auto rounded-lg bg-red-500/80 hover:bg-red-600 transition-opacity"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    setShowRemoveConfirm({ type: 'banner' })
                  }}
                  title="Remove banner"
                >
                  <Trash2 size={20} className="text-white" />
                </Button>
              ) : null}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 relative">
          {/* Avatar */}
          <div 
            data-tour="avatar-upload"
            className={`absolute -top-14 sm:-top-20 left-6 ${isSelfProfile ? 'group' : ''}`}
            onMouseEnter={() => isSelfProfile && setAvatarHover(true)}
            onMouseLeave={() => isSelfProfile && setAvatarHover(false)}
          > 
            <Avatar
              src={avatarPreview || profileData.avatarUrl}
              alt="User Avatar"
              fallback={getInitials(profileData.name)}
              className="w-28 h-28 sm:w-32 md:w-40 sm:h-32 md:h-40 border-4 border-white dark:border-black transition-colors"
            />
            {isSelfProfile && avatarHover && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center gap-2 transition-opacity">
                <button
                  onClick={() => avatarUploadRef.current && avatarUploadRef.current.click()}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  title="Change avatar"
                >
                  <Camera size={20} className="text-white" />
                </button>
                {avatarPreview || profileData.avatarUrl ? (
                  <button
                    data-tour="avatar-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowRemoveConfirm({ type: 'avatar' })
                    }}
                    className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
                    title="Remove avatar"
                  >
                    <Trash2 size={20} className="text-white" />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* Desktop Action Bar */}
          <div className="hidden sm:flex justify-end items-center gap-3">
            {isSelfProfile ? (
              <>
                <Button
                  variant="primary"
                  className=""
                  disabled
                >
                  {workStatus === 'Employer' ? 'Recruiter' : 'Open to work'}
                </Button>
                <Button 
                  data-tour="add-section-desktop"
                  variant="secondary" 
                  className="" 
                  onClick={onAddSection}
                >
                  Add profile section
                </Button>
                <Button variant="secondary" className="p-2.5 h-auto" onClick={() => router.push('/settings/profile')} title="Settings">
                  <Settings size={20} />
                </Button>
                <Button 
                  data-tour="edit-profile"
                  variant="secondary" 
                  className="p-2.5 h-auto" 
                  onClick={() => setEditModalOpen(true)} 
                  title="Edit Personal Info"
                >
                  <Edit3 size={20} />
                </Button>
              </>
            ) : (
              <>
                {/* Show pending request buttons if there's a pending request from this user */}
                {hasPendingRequest && pendingRequestData ? (
                  <div className="flex gap-3">
                    <Button 
                      variant="primary" 
                      className="" 
                      onClick={handleAcceptPendingRequest}
                      disabled={acceptingRequest}
                    >
                      {acceptingRequest ? (
                        <><Loader2 size={16} className="animate-spin mr-2" />Accepting...</>
                      ) : (
                        <><CheckCircle size={16} className="mr-2" />Accept Request</>
                      )}
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="" 
                      onClick={handleRejectPendingRequest}
                      disabled={rejectingRequest}
                    >
                      {rejectingRequest ? (
                        <><Loader2 size={16} className="animate-spin mr-2" />Declining...</>
                      ) : (
                        <><XCircle size={16} className="mr-2" />Decline</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {connectionStatus === 'connected' ? (
                      <Button variant="secondary" className="" onClick={onDisconnect}>
                        Remove Connection
                      </Button>
                    ) : connectionStatus === 'pending' ? (
                      <Button variant="secondary" className="" onClick={onWithdraw}>
                        Withdraw Request
                      </Button>
                    ) : (
                      <Button variant="primary" className="" onClick={onFollow}>
                        Connect
                      </Button>
                    )}
                    <Button variant="secondary" className="" onClick={() => setShowShareModal(true)}><Share2 size={18} /></Button>
                    <div className="relative">
                      <Button variant="secondary" className="" onClick={handleMoreClick}><MoreHorizontal size={20} /></Button>
                      {showMore && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-brand-gray-200 dark:border-neutral-700 rounded-xl shadow-lg z-20 transition-colors">
                          <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-900 dark:text-neutral-200 hover:bg-brand-gray-100 dark:hover:bg-neutral-800 rounded-t-xl" onClick={() => { setShowMore(false); setShowShareModal(true); }}>
                            <Share2 size={16} /> Share Profile
                          </button>
                          <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-900 dark:text-neutral-200 hover:bg-brand-gray-100 dark:hover:bg-neutral-800" onClick={() => handleMoreAction('copy')}>
                            <ExternalLink size={16} /> Copy Link
                          </button>
                          {connectionStatus === 'connected' && (
                            <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-b-xl border-t border-brand-gray-200 dark:border-neutral-700" onClick={() => {
                              handleMoreAction('disconnect');
                              if (onDisconnect) onDisconnect();
                            }}>
                              <X size={16} /> Remove Connection
                            </button>
                          )}
                          {connectionStatus === 'pending' && (
                            <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-b-xl border-t border-brand-gray-200 dark:border-neutral-700" onClick={() => {
                              handleMoreAction('withdraw');
                              if (onWithdraw) onWithdraw();
                            }}>
                              <X size={16} /> Withdraw Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Spacer to push content below the avatar */}
          <div className="h-16 sm:h-12 md:h-16"></div>

          {/* User Details */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-gray-900 dark:text-white">{profileData.name}</h1>
            <p className="text-base text-brand-gray-600 dark:text-neutral-300 mt-1">{profileData.headline}</p>
            <div className="mt-2 text-sm text-brand-gray-500 dark:text-neutral-400 flex items-center gap-4">
              <span><MapPin size={14} className="inline mr-1" /> {profileData.location}</span>
              {/* Optionally add more info here */}
            </div>
          </div>

          {/* Mobile Action Bar */}
          <div className="mt-6 flex sm:hidden flex-wrap gap-3 justify-start">
            {isSelfProfile ? (
              <>
                <Button
                  variant="primary"
                  className=""
                  disabled
                >
                  {workStatus === 'Employer' ? 'Recruiter' : 'Open to work'}
                </Button>
                <Button 
                  data-tour="add-section-mobile"
                  variant="secondary" 
                  className="" 
                  onClick={onAddSection}
                >
                  Add section
                </Button>
                <Button variant="secondary" className="p-2.5 h-auto" onClick={() => router.push('/settings/profile')} title="Settings">
                  <Settings size={18} />
                </Button>
                <Button variant="secondary" className="" onClick={() => setEditModalOpen(true)}>Edit</Button>
              </>
            ) : (
              <>
                {/* Show pending request buttons if there's a pending request from this user */}
                {hasPendingRequest && pendingRequestData ? (
                  <div className="flex gap-3 flex-wrap">
                    <Button 
                      variant="primary" 
                      className="text-sm" 
                      onClick={handleAcceptPendingRequest}
                      disabled={acceptingRequest}
                    >
                      {acceptingRequest ? (
                        <><Loader2 size={14} className="animate-spin mr-1" />Accept...</>
                      ) : (
                        <><CheckCircle size={14} className="mr-1" />Accept</>
                      )}
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="text-sm" 
                      onClick={handleRejectPendingRequest}
                      disabled={rejectingRequest}
                    >
                      {rejectingRequest ? (
                        <><Loader2 size={14} className="animate-spin mr-1" />Declining...</>
                      ) : (
                        <><XCircle size={14} className="mr-1" />Decline</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    {connectionStatus === 'connected' ? (
                      <Button variant="secondary" className="" onClick={onDisconnect}>
                        Remove Connection
                      </Button>
                    ) : connectionStatus === 'pending' ? (
                      <Button variant="secondary" className="" onClick={onWithdraw}>
                        Withdraw Request
                      </Button>
                    ) : (
                      <Button variant="primary" className="" onClick={onFollow}>
                        Connect
                      </Button>
                    )}
                    <Button variant="secondary" className="" onClick={() => setShowShareModal(true)}><Share2 size={18} /></Button>
                    <div className="relative">
                      <Button variant="secondary" className="" onClick={handleMoreClick}><MoreHorizontal size={20} /></Button>
                      {showMore && (
                        <div className="absolute right-0 mt-2 w-40 bg-neutral-800 border border-neutral-700 rounded-xl shadow-lg z-20">
                          <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 rounded-t-xl" onClick={() => { setShowMore(false); setShowShareModal(true); }}>
                            <Share2 size={16} /> Share Profile
                          </button>
                          <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700" onClick={() => handleMoreAction('copy')}>
                            <ExternalLink size={16} /> Copy Link
                          </button>
                          {connectionStatus === 'connected' && (
                            <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-950/20 rounded-b-xl border-t border-neutral-700" onClick={() => {
                              handleMoreAction('disconnect');
                              if (onDisconnect) onDisconnect();
                            }}>
                              <X size={16} /> Remove Connection
                            </button>
                          )}
                          {connectionStatus === 'pending' && (
                            <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-orange-400 hover:bg-orange-950/20 rounded-b-xl border-t border-neutral-700" onClick={() => {
                              handleMoreAction('withdraw');
                              if (onWithdraw) onWithdraw();
                            }}>
                              <X size={16} /> Withdraw Request
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* After the Open to work button and dropdown, show the selected status if set */}
          {workStatus && (
            <div className="mt-2 text-sm text-purple-400 font-semibold">{workStatus}</div>
          )}

          {/* Resume Actions */}
          <div className="mt-6 flex gap-3 items-center">
            <Button
              variant="primary"
              className=""
              onClick={() => {
                const urlToOpen = resumeUrl || resumeUrlProp;
                if (urlToOpen) {
                  // For PDFs, add #view=FitH to force browser to show instead of download
                  // Open in new tab with viewer
                  const viewerUrl = urlToOpen.toLowerCase().endsWith('.pdf') 
                    ? `${urlToOpen}#view=FitH` 
                    : urlToOpen;
                  window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                } else {
                  showToast('No resume uploaded yet. Please upload a resume first.', 'info');
                }
              }}
            >
              View Resume
            </Button>
            {isSelfProfile && (
              <Button variant="secondary" className="" onClick={() => setShowResumeModal(true)}>
                Upload Resume
              </Button>
            )}
            {resumeUploading && <span className="text-sm text-purple-500 ml-2">Uploading...</span>}
            {resumeError && <span className="text-sm text-red-500 ml-2">{resumeError}</span>}
          </div>

          {/* Resume Drag & Drop Modal */}
          <ResumeDragDropModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            onUpload={async (file) => {
              setResumeUploading(true);
              setResumeError(null);
              setResumeFile(file);
              try {
                const result = await uploadProfileImage(file, 'resume');
                if (result.success) {
                  const uploadData = result.data as Record<string, unknown> | undefined;
                  const resumeData = uploadData?.resume as Record<string, unknown> | undefined;
                  const uploadedUrl =
                    (resumeData?.fileUrl as string | undefined) ||
                    (resumeData?.file_url as string | undefined) ||
                    (uploadData?.resume_url as string | undefined) ||
                    (uploadData?.fileUrl as string | undefined) ||
                    (uploadData?.file_url as string | undefined) ||
                    null;

                  if (uploadedUrl) {
                    setResumeUrl(uploadedUrl);
                  }

                  showToast('Resume uploaded successfully!', 'success');
                  if (onProfileRefresh) onProfileRefresh();
                } else {
                  setResumeError(result.message || 'Upload failed');
                }
              } catch (err) {
                setResumeError(err instanceof Error ? err.message : 'Upload failed');
              } finally {
                setResumeUploading(false);
                setShowResumeModal(false);
              }
            }}
          />

        </div>
      </div>
      <EditIntroModal 
        isOpen={isEditModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        introData={personalInfoState || {
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          country: '',
          state_province: '',
          city: '',
        }} 
        onSave={handleSavePersonalInfo} 
      />
      
      {/* Role Switch Modal */}
      <RoleSwitchModal
        isOpen={showRoleSwitchModal}
        onClose={() => {
          setShowRoleSwitchModal(false);
          setAttemptedStatus(null);
        }}
        currentRole={userRole}
        targetRole={userRole === 'student' ? 'professional' : 'student'}
        message={`The status "${attemptedStatus}" is only available for ${userRole === 'student' ? 'Professionals' : 'Students'}. Switch your role to access this option.`}
        onConfirmSwitch={handleRoleSwitch}
        isLoading={isUploading}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        profileName={profileData.name}
        profileUrl={typeof window !== 'undefined' ? window.location.href : ''}
        onCopySuccess={() => showToast('Profile link copied to clipboard!', 'success')}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        position="top"
      />
      
      {/* Remove Confirmation Modal */}
      <AnimatePresence>
        {showRemoveConfirm.type && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={() => !isRemoving && setShowRemoveConfirm({ type: null })}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              variants={modalContentVariants}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 border border-brand-gray-200 dark:border-neutral-800 rounded-3xl w-full max-w-md shadow-xl transition-colors"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-brand-gray-900 dark:text-white">
                    Remove {showRemoveConfirm.type === 'avatar' ? 'Avatar' : 'Banner'}?
                  </h2>
                  {!isRemoving && (
                    <button
                      className="p-2 text-brand-gray-400 dark:text-neutral-500 hover:text-brand-gray-900 dark:hover:text-white"
                      onClick={() => setShowRemoveConfirm({ type: null })}
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                <p className="text-brand-gray-600 dark:text-neutral-300 mb-6">
                  Are you sure you want to remove your {showRemoveConfirm.type}? 
                  {showRemoveConfirm.type === 'banner' && ' A default banner will be displayed.'}
                  {showRemoveConfirm.type === 'avatar' && ' A default placeholder will be shown.'}
                </p>
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowRemoveConfirm({ type: null })}
                    disabled={isRemoving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={showRemoveConfirm.type === 'avatar' ? handleRemoveAvatar : handleRemoveBanner}
                    disabled={isRemoving}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} className="mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileHeroPlugPlay;
