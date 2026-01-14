// Challenge submission types

export interface ChallengeSubmission {
  id: string
  contest_id: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  answer: {
    s3Url: string
    fileType: string
    filename: string
    submittedAt: string
  }
  winner: boolean
  submitted_at: string
}

export interface ChallengeSubmissionsResponse {
  status: number
  message: string
  success: boolean
  data: {
    submissions: ChallengeSubmission[]
    total: number
  }
}

// Contest types
export interface Contest {
  id: string
  title: string
  description: string
  problem_statement: string
  problem_statement_images?: Array<{
    file_url: string
  }>
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_time: string
  end_time: string
  poster:string,
  created_by: string
  created_at: string
  updated_at: string
}

export interface ContestsResponse {
  status: number
  message: string
  success: boolean
  data: {
    contests: Contest[]
    pagination: {
      total: number
      limit: number
      offset: number
      pages: number
    }
  }
}

export interface ContestResponse {
  status: number
  message: string
  success: boolean
  data: Contest
}

export interface StartContestRequest {
  start_time: string
  end_time: string
}
