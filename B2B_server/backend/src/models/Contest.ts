/**
 * Contest Model - TypeScript interfaces for contest/challenge functionality
 */

export interface SubmissionFile {
  file_name: string;
  file_url: string;
}

export interface Contest {
  id: string;
  title: string;
  description?: string;
  problem_statement: string;
  problem_statement_images?: Array<{ file_url: string }>;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  start_time: Date | null;
  end_time: Date | null;
  poster: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContestData {
  title: string;
  description?: string;
  problem_statement: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  start_time?: Date | null;
  end_time?: Date | null;
}

export interface UpdateContestData {
  title?: string;
  description?: string;
  problem_statement?: string;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  start_time?: Date | null;
  end_time?: Date | null;
}

export interface ContestResponse {
  id: string;
  title: string;
  description?: string | undefined;
  problem_statement: string;
  problem_statement_image?: Array<{ file_url: string }>;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  start_time: string | null;
  end_time: string | null;
  poster?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContestAnswer {
  id: string;
  contest_id: string;
  user_id: string;
  answer: SubmissionFile | null;
  winner: boolean;
  has_profile: boolean;
  user_info: UserInfo | null;
  submitted_at: Date;
}

export interface UserInfo {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface CreateContestAnswerData {
  contest_id: string;
  user_id: string;
  answer: SubmissionFile;
}

export interface ContestAnswerResponse {
  id: string;
  contest_id: string;
  user_id: string;
  answer: SubmissionFile | null;
  winner: boolean;
  has_profile: boolean;
  user_info: UserInfo | null;
  submitted_at: string;
}

export interface RegisterContestData {
  has_profile: boolean;
  user_info?: UserInfo;
}

export interface ContestSubmissionResponse {
  id: string;
  contest_id: string;
  user_id: string;
  email?: string;
  has_profile: boolean;
  user_info: UserInfo | null;
  answer: SubmissionFile | null;
  winner: boolean;
  submitted_at: string;
}
