"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { Moon, Sun, Monitor, Check, ArrowLeft } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface ButtonProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}

// --- UI COMPONENTS ---
const Button: React.FC<ButtonProps> = ({ className = '', children, variant = 'primary', onClick }) => {
    const baseStyle = "px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm";
    const variants = {
        primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20",
        secondary: "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100",
    };
    return (
        <motion.button 
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.98 }} 
            className={`${baseStyle} ${variants[variant]} ${className}`}
            onClick={onClick}
        >
            {children}
        </motion.button>
    );
};

const Card: React.FC<CardProps> = ({ children, className = '', variants }) => (
    <motion.div 
        className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/70 rounded-3xl p-6 sm:p-8 ${className}`}
        variants={variants}
    >
        {children}
    </motion.div>
);

// --- THEME SETTINGS PAGE ---
const ThemeSettingsPage = () => {
  const router = useRouter();
  const [theme, setTheme] = useState('dark');
  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newColorScheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newColorScheme);
        document.documentElement.className = newColorScheme;
      }
    };

    const systemThemeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeWatcher.addEventListener('change', handleSystemThemeChange);

    if (theme === 'system') {
        const currentSystemTheme = systemThemeWatcher.matches ? 'dark' : 'light';
        setResolvedTheme(currentSystemTheme);
        document.documentElement.className = currentSystemTheme;
    } else {
        setResolvedTheme(theme);
        document.documentElement.className = theme;
    }
    
    return () => systemThemeWatcher.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);


  const themeOptions = [
    { value: 'light', label: 'Light', description: 'Clean and bright interface', icon: Sun },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light', icon: Moon },
    { value: 'system', label: 'System', description: 'Follows your device preference', icon: Monitor },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
            <Button
              variant="secondary"
              className="p-2.5 h-auto !rounded-xl"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Theme & Appearance
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Customize how the application looks on your device.
              </p>
            </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div 
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
          {/* Theme Selection Card */}
          <Card variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-6">Appearance Mode</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`relative p-6 rounded-2xl border-2 transition-all h-full text-center group ${isSelected ? "border-purple-600 bg-purple-500/10" : "border-neutral-200 dark:border-neutral-800 hover:border-purple-500/50"}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 transition-colors ${isSelected ? '!bg-purple-600' : 'group-hover:bg-purple-500/10'}`}>
                           <option.icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-white' : 'text-neutral-600 dark:text-neutral-300 group-hover:text-purple-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold">{option.label}</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{option.description}</p>
                        </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Current Theme Status Card */}
          <Card variants={itemVariants}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium">Current active theme</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Currently using <span className="font-semibold capitalize">{resolvedTheme}</span> mode
                  {theme === "system" && " (synced from your system preference)"}.
                </p>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-neutral-300 dark:border-neutral-600" />
                <div className="w-8 h-8 rounded-full bg-purple-600" />
                <div className="w-8 h-8 rounded-full bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-600" />
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

export default ThemeSettingsPage;
