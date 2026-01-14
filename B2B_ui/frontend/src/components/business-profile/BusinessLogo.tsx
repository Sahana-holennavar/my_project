"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

interface BusinessLogoProps {
  logo?: string;
  businessName: string;
}

export const BusinessLogo = ({ logo, businessName }: BusinessLogoProps) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    // Check if logo is provided and not a broken/placeholder URL
    if (logo && !logo.includes('cdn.example.com') && logo.trim() !== '') {
      setLogoSrc(logo);
      setShowIcon(false);
    } else {
      // Try to generate a fallback using UI Avatars
      const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&size=128&background=6366f1&color=ffffff&bold=true`;
      setLogoSrc(fallbackUrl);
      setShowIcon(false);
    }
  }, [logo, businessName]);

  const handleImageError = () => {
    // If the image fails to load, show the icon fallback
    setLogoSrc(null);
    setShowIcon(true);
  };

  if (showIcon || !logoSrc) {
    return (
      <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-white dark:bg-neutral-800 rounded-3xl flex items-center justify-center border-4 border-white dark:border-neutral-900 shadow-xl">
        <Building2 className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-purple-600 dark:text-purple-400" />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={`${businessName} Logo`}
      className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white dark:border-neutral-900 shadow-xl"
      onError={handleImageError}
    />
  );
};