import React, { useRef } from 'react';
import { Edit3, Camera } from 'lucide-react';

interface ProfileHeroProps {
  name: string;
  bannerUrl: string;
  avatarUrl: string;
  editable?: boolean;
  onEditBanner?: (file: File) => void;
  onEditAvatar?: (file: File) => void;
}

// Placeholder for cropping logic (to be implemented with a cropping library)
const cropImage = async (file: File): Promise<File> => {
  // TODO: Integrate cropping UI (e.g., react-easy-crop, react-avatar-editor)
  return file;
};

export const ProfileHero: React.FC<ProfileHeroProps> = ({
  name,
  bannerUrl,
  avatarUrl,
  editable = false,
  onEditBanner,
  onEditAvatar,
}) => {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const cropped = await cropImage(e.target.files[0]);
      onEditBanner?.(cropped);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const cropped = await cropImage(e.target.files[0]);
      onEditAvatar?.(cropped);
    }
  };

  return (
    <div className="relative w-full h-64 bg-gray-900 rounded-b-2xl overflow-hidden">
      {/* Banner */}
      <img
        src={bannerUrl}
        alt="Banner"
        className="w-full h-48 object-cover object-center"
      />
      {editable && (
        <button
          className="absolute top-4 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80"
          onClick={() => bannerInputRef.current?.click()}
          aria-label="Edit banner"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>
      )}
      <input
        type="file"
        accept="image/*"
        ref={bannerInputRef}
        className="hidden"
        onChange={handleBannerChange}
      />
      {/* Avatar */}
      <div className="absolute left-8 bottom-0 translate-y-1/2 flex items-end">
        <div className="relative">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-32 h-32 rounded-full border-4 border-white object-cover object-center shadow-lg"
          />
          {editable && (
            <button
              className="absolute bottom-2 right-2 bg-black/60 p-2 rounded-full hover:bg-black/80"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Edit avatar"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            ref={avatarInputRef}
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="ml-6 mb-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">{name}</h1>
        </div>
      </div>
      {/* Edit button for hero section */}
      {editable && (
        <a
          href="/profile/edit-hero"
          className="absolute top-4 left-4 bg-black/60 p-2 rounded-full hover:bg-black/80 text-white"
        >
          <Edit3 className="w-5 h-5" />
        </a>
      )}
    </div>
  );
};
