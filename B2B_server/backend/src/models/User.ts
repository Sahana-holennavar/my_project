export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export enum TutorialStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
  SKIPPED = 'skipped'
}

export interface RegisterUserData {
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export interface DeactivateAccountData {
  active: string;
}

export interface DeactivateAccountResponse {
  user: {
    id: string;
    email: string;
    active: boolean;
    deactivatedAt: string;
  };
}

export interface LoginUserData {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginUserResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    role: string;
    tutorial_status: TutorialStatus;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// Google OAuth interfaces
export interface GoogleAuthData {
  token: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
    provider: string;
    role: string;
    created_at?: string;
    last_login?: string;
  };
}

export interface OAuthUserData {
  email: string;
  name: string;
  picture: string;
  provider: string;
  provider_id: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string | null;
  active: boolean;
  two_factor: boolean;
  provider: string;
  provider_id: string | null;
  name: string | null;
  picture: string | null;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateTutorialStatusData {
  tutorial_status: TutorialStatus;
}

export interface UpdateTutorialStatusResponse {
  user: {
    id: string;
    email: string;
    tutorial_status: TutorialStatus;
  };
}
