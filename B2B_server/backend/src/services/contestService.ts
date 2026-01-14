import { Pool, PoolClient } from 'pg';
import config from '../config/env';
import type { 
  Contest, 
  ContestAnswer, 
  CreateContestData, 
  UpdateContestData,
  ContestResponse,
  ContestAnswerResponse
} from '../models/Contest';

const pool = new Pool({
  user: config.DB_USER,
  host: config.DB_HOST,
  database: config.DB_NAME,
  password: config.DB_PASSWORD,
  port: config.DB_PORT,
});

const schema = config.DB_SCHEMA;

export class ContestService {
  // Create a new contest
  static async createContest(contestData: CreateContestData, organizerId: string): Promise<Contest> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO ${schema}.contest (
          title, description, problem_statement, status, start_time, end_time, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        contestData.title,
        contestData.description,
        contestData.problem_statement,
        contestData.status || 'draft',
        contestData.start_time || null,
        contestData.end_time || null,
        organizerId
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get contest by ID
  static async getContestById(contestId: string): Promise<Contest | null> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [contestId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Get all contests with optional filtering and pagination
  static async getAllContests(
    filters: { status?: string; created_by?: string },
    pagination: { limit?: number; offset?: number }
  ): Promise<{ contests: Contest[]; total: number }> {
    const client = await pool.connect();
    try {
      const whereClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClauses.push(`status = $${paramIndex}`);
        values.push(filters.status);
        paramIndex++;
      }

      if (filters.created_by) {
        whereClauses.push(`created_by = $${paramIndex}`);
        values.push(filters.created_by);
        paramIndex++;
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM ${schema}.contest 
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const limit = pagination.limit || 10;
      const offset = pagination.offset || 0;

      const query = `
        SELECT * FROM ${schema}.contest 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      values.push(limit, offset);
      const result = await client.query(query, values);

      return {
        contests: result.rows,
        total
      };
    } finally {
      client.release();
    }
  }

  // Update contest
  static async updateContest(
    contestId: string, 
    updateData: UpdateContestData, 
    organizerId: string
  ): Promise<Contest> {
    const client = await pool.connect();
    try {
      // First check if contest exists and user is the creator
      const checkQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1 AND created_by = $2
      `;
      const checkResult = await client.query(checkQuery, [contestId, organizerId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Contest not found or you are not authorized to update it');
      }

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.title !== undefined) {
        setClauses.push(`title = $${paramIndex}`);
        values.push(updateData.title);
        paramIndex++;
      }

      if (updateData.description !== undefined) {
        setClauses.push(`description = $${paramIndex}`);
        values.push(updateData.description);
        paramIndex++;
      }

      if (updateData.problem_statement !== undefined) {
        setClauses.push(`problem_statement = $${paramIndex}`);
        values.push(updateData.problem_statement);
        paramIndex++;
      }

      if (updateData.status !== undefined) {
        setClauses.push(`status = $${paramIndex}`);
        values.push(updateData.status);
        paramIndex++;
      }

      if (updateData.start_time !== undefined) {
        setClauses.push(`start_time = $${paramIndex}`);
        values.push(updateData.start_time);
        paramIndex++;
      }

      if (updateData.end_time !== undefined) {
        setClauses.push(`end_time = $${paramIndex}`);
        values.push(updateData.end_time);
        paramIndex++;
      }

      setClauses.push(`updated_at = NOW()`);

      const query = `
        UPDATE ${schema}.contest 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
        RETURNING *
      `;

      values.push(contestId, organizerId);
      const result = await client.query(query, values);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Delete contest
  static async deleteContest(contestId: string, organizerId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if contest exists and user is the creator
      const checkQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1 AND created_by = $2
      `;
      const checkResult = await client.query(checkQuery, [contestId, organizerId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Contest not found or you are not authorized to delete it');
      }

      // Delete all submissions for this contest first
      await client.query(
        `DELETE FROM ${schema}.contest_answers WHERE contest_id = $1`,
        [contestId]
      );

      // Delete the contest
      await client.query(
        `DELETE FROM ${schema}.contest WHERE id = $1 AND created_by = $2`,
        [contestId, organizerId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Start contest with time range
  static async startContest(
    contestId: string, 
    startTime: Date, 
    endTime: Date, 
    organizerId: string
  ): Promise<Contest> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get contest details first
      const contestQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1 AND created_by = $2
      `;
      const contestResult = await client.query(contestQuery, [contestId, organizerId]);
      
      if (contestResult.rows.length === 0) {
        throw new Error('Contest not found or you are not authorized to start it');
      }

      const contest = contestResult.rows[0];

      // Update contest status
      const updateQuery = `
        UPDATE ${schema}.contest 
        SET status = 'active', start_time = $1, end_time = $2, updated_at = NOW()
        WHERE id = $3 AND created_by = $4
        RETURNING *
      `;

      const result = await client.query(updateQuery, [startTime, endTime, contestId, organizerId]);

      // Get all registered users for this contest
      const registeredUsersQuery = `
        SELECT DISTINCT user_id FROM ${schema}.contest_answers 
        WHERE contest_id = $1
      `;
      const registeredUsers = await client.query(registeredUsersQuery, [contestId]);

      // Create notifications for all registered users
      if (registeredUsers.rows.length > 0) {
        const notificationContent = `The contest "${contest.title}" has started! You can now submit your solution.`;
        const notificationPayload = {
          contest_id: contestId,
          contest_title: contest.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        };

        for (const user of registeredUsers.rows) {
          await client.query(
            `INSERT INTO ${schema}.notifications (user_id, content, payload, type, read, delivery_method)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              user.user_id,
              notificationContent,
              JSON.stringify(notificationPayload),
              'contest_started',
              false,
              'in_app'
            ]
          );
        }
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Submit solution (user action)
  static async submitSolution(
    contestId: string,
    userId: string,
    fileData: { filename: string; s3Url: string; fileType: string }
  ): Promise<ContestAnswer> {
    const client = await pool.connect();
    try {
      // Check if contest exists and is active
      const contestQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1 AND status = 'active'
      `;
      const contestResult = await client.query(contestQuery, [contestId]);
      
      if (contestResult.rows.length === 0) {
        throw new Error('Contest not found or is not active');
      }

      const contest = contestResult.rows[0];
      const now = new Date();

      // Check if contest is within time range
      if (contest.start_time && now < new Date(contest.start_time)) {
        throw new Error('Contest has not started yet');
      }

      if (contest.end_time && now > new Date(contest.end_time)) {
        throw new Error('Contest has ended');
      }

      // Check if user is registered for this contest
      const registrationQuery = `
        SELECT * FROM ${schema}.contest_answers 
        WHERE contest_id = $1 AND user_id = $2
      `;
      const registrationResult = await client.query(registrationQuery, [contestId, userId]);
      
      if (registrationResult.rows.length === 0) {
        throw new Error('You must register for this contest before submitting a solution');
      }

      const registration = registrationResult.rows[0];

      // Check if user has already submitted a solution
      if (registration.answer !== null) {
        throw new Error('You have already submitted a solution for this contest');
      }

      // Update the registration entry with the answer
      const updateQuery = `
        UPDATE ${schema}.contest_answers 
        SET answer = $1, submitted_at = NOW()
        WHERE contest_id = $2 AND user_id = $3
        RETURNING *
      `;

      const answerData = {
        filename: fileData.filename,
        s3Url: fileData.s3Url,
        fileType: fileData.fileType,
        submittedAt: now.toISOString()
      };

      const result = await client.query(updateQuery, [
        JSON.stringify(answerData),
        contestId,
        userId
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Register for contest
  static async registerForContest(
    contestId: string,
    userId: string,
    hasProfile: boolean,
    userInfo?: { firstName: string; lastName: string; phoneNumber?: string }
  ): Promise<ContestAnswer> {
    const client = await pool.connect();
    try {
      // Check if contest exists
      const contestQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1
      `;
      const contestResult = await client.query(contestQuery, [contestId]);
      
      if (contestResult.rows.length === 0) {
        throw new Error('Contest not found');
      }

      // Check if user is already registered
      const existingRegistrationQuery = `
        SELECT * FROM ${schema}.contest_answers 
        WHERE contest_id = $1 AND user_id = $2
      `;
      const existingRegistration = await client.query(existingRegistrationQuery, [contestId, userId]);
      
      if (existingRegistration.rows.length > 0) {
        throw new Error('You are already registered for this contest');
      }

      let userInfoData: { firstName: string; lastName: string; phoneNumber?: string };

      if (hasProfile) {
        // Retrieve user info from user_profiles table
        const profileQuery = `
          SELECT profile_data->'personal_information'->>'first_name' as first_name,
                 profile_data->'personal_information'->>'last_name' as last_name,
                 profile_data->'personal_information'->>'phone_number' as phone_number
          FROM ${schema}.user_profiles 
          WHERE user_id = $1
        `;
        const profileResult = await client.query(profileQuery, [userId]);
        
        if (profileResult.rows.length === 0 || !profileResult.rows[0].first_name || !profileResult.rows[0].last_name) {
          throw new Error('User profile information not found. Please provide user_info or complete your profile.');
        }

        userInfoData = {
          firstName: profileResult.rows[0].first_name,
          lastName: profileResult.rows[0].last_name,
          ...(profileResult.rows[0].phone_number && { phoneNumber: profileResult.rows[0].phone_number })
        };
      } else {
        // Use provided user info
        if (!userInfo || !userInfo.firstName || !userInfo.lastName) {
          throw new Error('user_info with firstName and lastName is required when has_profile is false');
        }
        userInfoData = {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          ...(userInfo.phoneNumber && { phoneNumber: userInfo.phoneNumber })
        };
      }

      // Insert registration entry
      const insertQuery = `
        INSERT INTO ${schema}.contest_answers (
          contest_id, user_id, has_profile, user_info, answer
        ) VALUES ($1, $2, $3, $4, NULL)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        contestId,
        userId,
        hasProfile,
        JSON.stringify(userInfoData)
      ]);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all submissions for a contest (organizer only)
  static async getContestSubmissions(contestId: string): Promise<ContestAnswerResponse[]> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          ca.*,
          u.email
        FROM ${schema}.contest_answers ca
        INNER JOIN ${schema}.users u ON ca.user_id = u.id
        WHERE ca.contest_id = $1
        ORDER BY ca.submitted_at DESC
      `;

      const result = await client.query(query, [contestId]);

      return result.rows.map(row => ({
        id: row.id,
        contest_id: row.contest_id,
        user_id: row.user_id,
        email: row.email,
        has_profile: row.has_profile,
        user_info: row.user_info,
        answer: row.answer,
        winner: row.winner,
        submitted_at: row.submitted_at
      }));
    } finally {
      client.release();
    }
  }

  // Select winner for a contest (organizer only)
  static async selectWinner(
    contestId: string,
    submissionId: string,
    organizerId: string
  ): Promise<ContestAnswer> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if contest exists and user is the creator
      const contestQuery = `
        SELECT * FROM ${schema}.contest 
        WHERE id = $1 AND created_by = $2
      `;
      const contestResult = await client.query(contestQuery, [contestId, organizerId]);
      
      if (contestResult.rows.length === 0) {
        throw new Error('Contest not found or you are not authorized');
      }

      // Check if submission exists and belongs to this contest
      const submissionQuery = `
        SELECT * FROM ${schema}.contest_answers 
        WHERE id = $1 AND contest_id = $2
      `;
      const submissionResult = await client.query(submissionQuery, [submissionId, contestId]);
      
      if (submissionResult.rows.length === 0) {
        throw new Error('Submission not found for this contest');
      }

      // Check if there's already a winner
      const winnerQuery = `
        SELECT * FROM ${schema}.contest_answers 
        WHERE contest_id = $1 AND winner = true
      `;
      const existingWinner = await client.query(winnerQuery, [contestId]);
      
      if (existingWinner.rows.length > 0) {
        throw new Error('A winner has already been selected for this contest');
      }

      // Set the winner
      const updateQuery = `
        UPDATE ${schema}.contest_answers 
        SET winner = true
        WHERE id = $1 AND contest_id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [submissionId, contestId]);

      // Update contest status to completed
      await client.query(
        `UPDATE ${schema}.contest SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [contestId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user's submission for a contest
  static async getUserSubmission(contestId: string, userId: string): Promise<ContestAnswer | null> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM ${schema}.contest_answers 
        WHERE contest_id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [contestId, userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Check registration and submission status
  static async checkRegistrationStatus(
    contestId: string,
    userId: string
  ): Promise<{ has_registered: boolean; has_submitted: boolean }> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT answer FROM ${schema}.contest_answers 
        WHERE contest_id = $1 AND user_id = $2
      `;
      
      const result = await client.query(query, [contestId, userId]);
      
      if (result.rows.length === 0) {
        return { has_registered: false, has_submitted: false };
      }

      const answer = result.rows[0].answer;
      const has_submitted = answer !== null && answer !== undefined;

      return { has_registered: true, has_submitted };
    } finally {
      client.release();
    }
  }
}
