"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowLeft, Mail, Briefcase, Award, UserCheck, ChevronsUpDown, Check, type LucideIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateProfilePrivacySettings } from '@/store/slices/profileSlice';
import { type PrivacySettings } from '@/lib/api/profile';
import { toast } from 'sonner';

// --- TYPE DEFINITIONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  disabled?: boolean;
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  isOpen: boolean;
  className?: string;
  align?: 'start' | 'end';
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onSelect: () => void;
  isSelected: boolean;
}

interface DropdownSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  options: string[];
  icon: LucideIcon;
}

interface SwitchProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: { target: { name: string; value: boolean; type: string; checked: boolean } }) => void;
  icon: LucideIcon;
}

// --- UI COMPONENTS ---
const Button = ({ className = '', children, variant = 'primary', disabled, onClick, ...props }: ButtonProps) => {
    const baseStyle = "px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
    const variantStyles: Record<string, string> = {
        primary: "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20",
        secondary: "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100",
        ghost: "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
        outline: "bg-transparent border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
    };
    return ( 
      <motion.button 
        whileHover={disabled ? undefined : { scale: 1.03 }} 
        whileTap={disabled ? undefined : { scale: 0.98 }} 
        className={`${baseStyle} ${variantStyles[variant] || variantStyles.primary} ${className}`} 
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </motion.button> 
    );
};

const Card = ({ children, className = '', ...props }: CardProps) => (
    <motion.div 
        className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/70 rounded-3xl p-6 sm:p-8 ${className}`}
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
        {...props}
    >
        {children}
    </motion.div>
);

// --- Mock Shadcn/UI Dropdown Components ---
const dropdownVariants: Variants = { 
  hidden: { opacity: 0, y: -10, scale: 0.95 }, 
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 200 } }, 
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } } 
};

const DropdownMenu = ({ children }: DropdownMenuProps) => <div className="relative inline-block text-left">{children}</div>;

const DropdownMenuTrigger = ({ children, onClick, className }: DropdownMenuTriggerProps) => (
    <Button variant="outline" className={`min-w-[180px] justify-between ${className}`} onClick={onClick}>
        {children}
        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
    </Button>
);

const DropdownMenuContent = ({ children, isOpen, className = '', align = 'start' }: DropdownMenuContentProps) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`absolute z-10 mt-2 w-56 origin-top-${align} rounded-xl bg-white dark:bg-neutral-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-neutral-200 dark:border-neutral-700 ${align === 'end' ? 'right-0' : 'left-0'} ${className}`}
            >
                <div className="py-1">{children}</div>
            </motion.div>
        )}
    </AnimatePresence>
);

const DropdownMenuItem = ({ children, onSelect, isSelected }: DropdownMenuItemProps) => (
    <button
        onClick={onSelect}
        className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
    >
        {children}
        {isSelected && <Check className="h-4 w-4 text-purple-600" />}
    </button>
);

// --- Updated Select Component using Dropdown ---
const DropdownSelect = ({ label, name, value, onChange, options, icon: Icon }: DropdownSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

     useEffect(() => { 
       const handleClickOutside = (event: MouseEvent) => { 
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); 
       }; 
       document.addEventListener("mousedown", handleClickOutside); 
       return () => document.removeEventListener("mousedown", handleClickOutside); 
     }, []);

    const handleSelect = (optionValue: string) => {
        onChange({ target: { name, value: optionValue } });
        setIsOpen(false);
    };

    return (
        <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
            <div className="flex items-center gap-4">
                 {Icon && <Icon className="w-5 h-5 text-neutral-500" />}
                 <label className="text-base text-neutral-800 dark:text-neutral-100">{label}</label>
            </div>
            <div ref={dropdownRef}>
                <DropdownMenu>
                    <DropdownMenuTrigger onClick={() => setIsOpen(!isOpen)}>
                        {value}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent isOpen={isOpen} align="end">
                        {options.map((option: string) => (
                            <DropdownMenuItem 
                                key={option} 
                                onSelect={() => handleSelect(option)}
                                isSelected={value === option}
                            >
                                {option}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

const Switch = ({ label, name, checked, onChange, icon: Icon }: SwitchProps) => (
    <div className="flex items-center justify-between py-4 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
       <div className="flex items-center gap-4">
             {Icon && <Icon className="w-5 h-5 text-neutral-500" />}
             <label htmlFor={name} className="text-base text-neutral-800 dark:text-neutral-100">{label}</label>
        </div>
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange({ target: { name, value: !checked, type: 'checkbox', checked: !checked } })}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-purple-600' : 'bg-neutral-300 dark:bg-neutral-700'}`}
        >
            <motion.span
                layout
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    </div>
);

// --- PRIVACY SETTINGS PAGE ---
const PrivacySettingsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profile, updating } = useAppSelector((state) => state.profile);
  const user = useAppSelector((state) => state.auth.user);

  // Initialize settings from profile or defaults (including profile_visibility even though we don't show it)
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: "Connections Only", // Keep default but don't show in UI
    contact_visibility: "Connections Only",
    experience_visibility: "Public",
    skills_visibility: true,
    recruiter_contact: true
  });

  // Load privacy settings from profile when available
  useEffect(() => {
    if (profile?.privacy_settings) {
      setSettings(profile.privacy_settings);
    }
  }, [profile]);

  const visibilityOptions = ["Public", "Connections Only", "Private"];
  
  const handleChange = (e: { target: { name: string; value: string | boolean; type?: string; checked?: boolean } }) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
      if (!user?.id) {
        toast.error("User not authenticated");
        return;
      }

      try {
        await dispatch(updateProfilePrivacySettings({
          userId: user.id,
          privacySettings: settings
        })).unwrap();
        
        toast.success("Privacy settings saved successfully!");
      } catch (error) {
        console.error("Error saving privacy settings:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to save privacy settings";
        toast.error(errorMessage);
      }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } }};

  return (
    <div className="min-h-screen w-full bg-neutral-100 dark:bg-neutral-950 font-sans transition-colors">
       <header className="py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
                <Button variant="secondary" className="p-2.5 h-auto !rounded-xl" onClick={() => router.back()}>
                     <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                    Privacy Settings
                  </h1>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Control who sees your information and activity.
                  </p>
                </div>
            </div>
        </header>

         <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <motion.div initial="hidden" animate="visible" variants={containerVariants}>
                <Card variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                    <DropdownSelect 
                        label="Contact Info Visibility" 
                        name="contact_visibility" 
                        value={settings.contact_visibility} 
                        onChange={handleChange} 
                        options={visibilityOptions}
                        icon={Mail}
                    />
                    <DropdownSelect 
                        label="Experience Visibility" 
                        name="experience_visibility" 
                        value={settings.experience_visibility} 
                        onChange={handleChange} 
                        options={visibilityOptions}
                        icon={Briefcase}
                    />
                    <Switch 
                        label="Skills Visibility" 
                        name="skills_visibility" 
                        checked={settings.skills_visibility} 
                        onChange={handleChange} 
                        icon={Award}
                    />
                     <Switch 
                        label="Allow Recruiters to Contact" 
                        name="recruiter_contact" 
                        checked={settings.recruiter_contact} 
                        onChange={handleChange} 
                        icon={UserCheck}
                    />
                </Card>
                
                <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="mt-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={updating}>
                      {updating ? "Saving..." : "Save Changes"}
                    </Button>
                </motion.div>
            </motion.div>
         </main>
    </div>
  );
};

export default PrivacySettingsPage;
