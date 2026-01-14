export interface UserProfile {
  user_id: string;
  role: string;
  profile_data: ProfileData;
  privacy_settings: PrivacySettings;
  about?: string;
  social_links?: SocialLinks;
  experience?: Experience[];
  projects?: Project[];
  education?: Education[];
  achievements?: Achievement[];
  skills?: Skill[];
  certifications?: Certification[];
  posts?: Post[];
  products?: Product[];
  created_at: Date;
  updated_at: Date;
}

export interface ProfileData {
  personal_information: PersonalInformation;
  about?: AboutSection;
  experience?: Experience[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  awards?: Award[];
  certifications?: Certification[];
  resume?: ResumeData;
  avatar?: AvatarData;
  banner?: BannerData;
}

export interface PersonalInformation {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  date_of_birth: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  country: string;
  state_province: string;
  city: string;
  postal_code?: string;
}

export interface AboutSection {
  professional_summary?: string;
  industry?: string;
  current_status?: string;
}

export interface Experience {
  company_name: string;
  job_title: string;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
  start_date: string;
  end_date?: string;
  job_description?: string;
  currently_working: boolean;
}

export interface Education {
  institution_name: string;
  degree_type: 'Bachelor\'s' | 'Master\'s' | 'PhD' | 'Diploma' | 'Certificate';
  field_of_study: string;
  start_year: number;
  end_year?: number;
  gpa_grade?: number;
  currently_studying: boolean;
}

export interface Skill {
  skill_name: string;
  proficiency_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  years_of_experience?: number;
}

export interface Project {
  project_title: string;
  description: string;
  technologies_used: string[];
  project_url?: string;
  start_date: string;
  end_date?: string;
  project_type: 'Personal' | 'Academic' | 'Professional' | 'Open Source';
}

export interface Award {
  award_name: string;
  issuing_organization: string;
  date_received: string;
  description?: string;
  certificate_url?: string;
}

export interface Certification {
  certification_name: string;
  issuing_authority: string;
  license_number?: string;
  issue_date: string;
  expiration_date?: string;
  verification_url?: string;
  certificateUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface PrivacySettings {
  profile_visibility: 'Public' | 'Connections Only' | 'Private';
  contact_visibility: 'Public' | 'Connections Only' | 'Hidden';
  experience_visibility: 'Public' | 'Connections Only' | 'Hidden';
  skills_visibility: boolean;
  recruiter_contact: boolean;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  website?: string;
}

export interface Achievement {
  title: string;
  description: string;
  date: string;
  issuer?: string;
}

export interface Post {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'link';
  media?: any;
  audience: 'public' | 'private' | 'connections';
  created_at: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  created_at: Date;
}

export interface CreateProfileData {
  profile_data: ProfileData;
}

export interface CreateProfileResponse {
  profile_id: string;
  user_id: string;
  profile_data: ProfileData;
  created_at: string;
}

export interface EditProfileResponse {
  profile_id: string;
  user_id: string;
  profile_data: ProfileData;
  updated_at: string;
}

export interface ResumeData {
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface AvatarData {
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface BannerData {
  fileId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}