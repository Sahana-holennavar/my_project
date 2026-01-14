import { database } from '../config/database';
import { config } from '../config/env';
import { CreateJobData, UpdateJobData, Job, SearchJobCriteria, SearchJobsServiceResponse } from '../models/Job';
import { ApplicationResponse } from '../models/Application';

export class JobsService {
  async createJob(jobData: CreateJobData, profileId: string, userId: string): Promise<Job> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const profileCheckQuery = `
        SELECT id FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;
      const profileResult = await client.query(profileCheckQuery, [profileId]);
      if (profileResult.rows.length === 0) {
        throw new Error('Business profile not found');
      }
      // Prepare JSON values for comparison
      const skillsJson = jobData.skills ? JSON.stringify(jobData.skills) : JSON.stringify([]);
      const locationJson = jobData.location ? JSON.stringify(jobData.location) : JSON.stringify({});
      const experienceLevelJson = jobData.experience_level ? JSON.stringify(jobData.experience_level) : JSON.stringify({});
      
      // Check for exact duplicate: same title, location, experience, employment type, and job mode
      const duplicateCheckQuery = `
        SELECT id FROM "${config.DB_SCHEMA}".Jobs
        WHERE LOWER(title) = LOWER($1) 
        AND company_id = $2
        AND location = $3
        AND experience_level = $4
        AND employment_type = $5
        AND job_mode = $6
        LIMIT 1
      `;
      const duplicateResult = await client.query(duplicateCheckQuery, [
        jobData.title,
        profileId,
        locationJson,
        experienceLevelJson,
        jobData.employment_type,
        jobData.job_mode || null
      ]);
      if (duplicateResult.rows.length > 0) {
        throw new Error('Exact job posting already exists with same title, location, experience level, employment type, and job mode');
      }
      const status = jobData.status || 'active';
      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".Jobs (
          title,
          job_description,
          employment_type,
          skills,
          status,
          job_mode,
          location,
          experience_level,
          company_id,
          created_by_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const insertValues = [
        jobData.title,
        jobData.job_description,
        jobData.employment_type,
        skillsJson,
        status,
        jobData.job_mode || null,
        locationJson,
        experienceLevelJson,
        profileId,
        userId
      ];
      const insertResult = await client.query(insertQuery, insertValues);
      await client.query('COMMIT');
      const job = insertResult.rows[0];
      return {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        job_mode: job.job_mode,
        location: typeof job.location === 'string' ? JSON.parse(job.location) : job.location,
        experience_level: typeof job.experience_level === 'string' ? JSON.parse(job.experience_level) : job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create job');
    } finally {
      client.release();
    }
  }

  async getAllJobs(profileId: string, page = 1, limit = 10): Promise<{ jobs: Job[]; total: number; page: number; limit: number; }> {
    try {
      const offset = (page - 1) * limit;
      const jobsQuery = `
        SELECT * FROM "${config.DB_SCHEMA}".Jobs
        WHERE company_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const countQuery = `
        SELECT COUNT(*) FROM "${config.DB_SCHEMA}".Jobs
        WHERE company_id = $1
      `;
      const jobsResult = await database.query(jobsQuery, [profileId, limit, offset]) as { rows: any[] };
      const countResult = await database.query(countQuery, [profileId]) as { rows: any[] };
      const total = parseInt(countResult.rows[0].count, 10);
      const jobs = jobsResult.rows.map(job => ({
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        job_mode: job.job_mode,
        location: typeof job.location === 'string' ? JSON.parse(job.location) : job.location,
        experience_level: typeof job.experience_level === 'string' ? JSON.parse(job.experience_level) : job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      }));
      return { jobs, total, page, limit };
    } catch (error) {
      console.error('Get all jobs error:', error);
      throw new Error('Failed to retrieve jobs');
    }
  }

  async getJobById(jobId: string, profileId: string): Promise<Job | null> {
    try {
      const query = `
        SELECT j.*, cp.company_profile_data->>'companyName' as company_name
        FROM "${config.DB_SCHEMA}".Jobs j
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON j.company_id = cp.id
        WHERE j.id = $1 AND j.company_id = $2
        LIMIT 1
      `;
      const result = await database.query(query, [jobId, profileId]) as { rows: any[] };
      if (result.rows.length === 0) {
        return null;
      }
      const job = result.rows[0];
      return {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        job_mode: job.job_mode,
        location: typeof job.location === 'string' ? JSON.parse(job.location) : job.location,
        experience_level: typeof job.experience_level === 'string' ? JSON.parse(job.experience_level) : job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id,
        company_name: job.company_name
      };
    } catch (error) {
      console.error('Get job by ID error:', error);
      throw new Error('Failed to retrieve job');
    }
  }

  async updateJob(jobId: string, profileId: string, updateData: UpdateJobData): Promise<Job> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const existingJobQuery = `
        SELECT * FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
        LIMIT 1
      `;
      const existingResult = await client.query(existingJobQuery, [jobId, profileId]);
      if (existingResult.rows.length === 0) {
        throw new Error('Job not found');
      }
      
      // Check for exact duplicate if updating title, location, experience, employment type, or job mode
      if (updateData.title !== undefined || updateData.location !== undefined || 
          updateData.experience_level !== undefined || updateData.employment_type !== undefined || 
          updateData.job_mode !== undefined) {
        
        const existingJob = existingResult.rows[0];
        const newTitle = updateData.title !== undefined ? updateData.title : existingJob.title;
        const newLocation = updateData.location !== undefined ? JSON.stringify(updateData.location) : existingJob.location;
        const newExperience = updateData.experience_level !== undefined ? JSON.stringify(updateData.experience_level) : existingJob.experience_level;
        const newEmploymentType = updateData.employment_type !== undefined ? updateData.employment_type : existingJob.employment_type;
        const newJobMode = updateData.job_mode !== undefined ? updateData.job_mode : existingJob.job_mode;
        
        const duplicateCheckQuery = `
          SELECT id FROM "${config.DB_SCHEMA}".Jobs
          WHERE LOWER(title) = LOWER($1) 
          AND company_id = $2
          AND location = $3
          AND experience_level = $4
          AND employment_type = $5
          AND job_mode = $6
          AND id != $7
          LIMIT 1
        `;
        const duplicateResult = await client.query(duplicateCheckQuery, [
          newTitle,
          profileId,
          newLocation,
          newExperience,
          newEmploymentType,
          newJobMode || null,
          jobId
        ]);
        if (duplicateResult.rows.length > 0) {
          throw new Error('Exact job posting already exists with same title, location, experience level, employment type, and job mode');
        }
      }
      
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;
      if (updateData.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        updateValues.push(updateData.title);
        paramIndex++;
      }
      if (updateData.job_description !== undefined) {
        updateFields.push(`job_description = $${paramIndex}`);
        updateValues.push(updateData.job_description);
        paramIndex++;
      }
      if (updateData.employment_type !== undefined) {
        updateFields.push(`employment_type = $${paramIndex}`);
        updateValues.push(updateData.employment_type);
        paramIndex++;
      }
      if (updateData.skills !== undefined) {
        updateFields.push(`skills = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.skills));
        paramIndex++;
      }
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(updateData.status);
        paramIndex++;
      }
      if (updateData.job_mode !== undefined) {
        updateFields.push(`job_mode = $${paramIndex}`);
        updateValues.push(updateData.job_mode);
        paramIndex++;
      }
      if (updateData.location !== undefined) {
        updateFields.push(`location = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.location));
        paramIndex++;
      }
      if (updateData.experience_level !== undefined) {
        updateFields.push(`experience_level = $${paramIndex}`);
        updateValues.push(JSON.stringify(updateData.experience_level));
        paramIndex++;
      }
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(jobId, profileId);
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".Jobs
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');
      const job = updateResult.rows[0];
      return {
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        job_mode: job.job_mode,
        location: typeof job.location === 'string' ? JSON.parse(job.location) : job.location,
        experience_level: typeof job.experience_level === 'string' ? JSON.parse(job.experience_level) : job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update job');
    } finally {
      client.release();
    }
  }

  async deleteJob(jobId: string, profileId: string): Promise<void> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const checkQuery = `
        SELECT id FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
        LIMIT 1
      `;
      const checkResult = await client.query(checkQuery, [jobId, profileId]);
      if (checkResult.rows.length === 0) {
        throw new Error('Job not found');
      }
      const deleteQuery = `
        DELETE FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
      `;
      await client.query(deleteQuery, [jobId, profileId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete job');
    } finally {
      client.release();
    }
  }

  async searchJobs(criteria: SearchJobCriteria): Promise<SearchJobsServiceResponse> {
    try {
      // Set default pagination values
      const page = Math.max(1, criteria.page || 1);
      const limit = Math.min(criteria.limit || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      // Build the WHERE clause dynamically based on provided criteria
      const whereConditions: string[] = ["status = 'active'"]; // Always filter for active jobs
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add title filter (ILIKE for case-insensitive partial match)
      if (criteria.title && criteria.title.trim()) {
        whereConditions.push(`LOWER(title) ILIKE LOWER($${paramIndex})`);
        queryParams.push(`%${criteria.title.trim()}%`);
        paramIndex++;
      }

      // Add job_mode filter (exact match)
      if (criteria.job_mode) {
        whereConditions.push(`job_mode = $${paramIndex}`);
        queryParams.push(criteria.job_mode);
        paramIndex++;
      }

      // Add employment_type filter (exact match)
      if (criteria.employment_type) {
        whereConditions.push(`employment_type = $${paramIndex}`);
        queryParams.push(criteria.employment_type);
        paramIndex++;
      }

      // Add location filter (JSONB contains search - searches city, state, country)
      if (criteria.location && criteria.location.trim()) {
        const locationSearch = criteria.location.trim().toLowerCase();
        whereConditions.push(`(
          LOWER(location->>'city') LIKE $${paramIndex} OR
          LOWER(location->>'state') LIKE $${paramIndex} OR
          LOWER(location->>'country') LIKE $${paramIndex}
        )`);
        queryParams.push(`%${locationSearch}%`);
        paramIndex++;
      }

      // Add experience_level filter (range overlap)
      if (criteria.experience_min !== undefined || criteria.experience_max !== undefined) {
        const minExp = criteria.experience_min ?? 0;
        const maxExp = criteria.experience_max ?? 999;

        // Check for range overlap: job's min <= maxExp AND job's max >= minExp
        whereConditions.push(`(
          COALESCE((experience_level->>'min')::int, 0) <= $${paramIndex + 1} AND
          COALESCE((experience_level->>'max')::int, 999) >= $${paramIndex}
        )`);
        queryParams.push(minExp);
        queryParams.push(maxExp);
        paramIndex += 2;
      }

      // Add skills filter (JSONB array overlap - match any skill)
      if (criteria.skills && criteria.skills.trim()) {
        const skillsArray = criteria.skills
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(s => s.length > 0);

        if (skillsArray.length > 0) {
          // Use JSONB array contains operator for skills matching
          const skillConditions = skillsArray.map((skill, index) => `
            EXISTS (SELECT 1 FROM jsonb_array_elements_text(skills) as skill_elem
            WHERE LOWER(skill_elem) = LOWER($${paramIndex + index}))
          `).join(' OR ');
          
          whereConditions.push(`(${skillConditions})`);
          skillsArray.forEach(skill => queryParams.push(skill));
          paramIndex += skillsArray.length;
        }
      }

      // Build the main query with COUNT and data retrieval
      const whereClause = whereConditions.join(' AND ');

      // Get total count using window function (more efficient)
      const countQuery = `
        SELECT COUNT(*) as total FROM "${config.DB_SCHEMA}".Jobs
        WHERE ${whereClause}
      `;

      const countResult = await database.query(countQuery, queryParams) as { rows: any[] };
      const total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      const selectQuery = `
        SELECT * FROM "${config.DB_SCHEMA}".Jobs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit);
      queryParams.push(offset);

      const result = await database.query(selectQuery, queryParams) as { rows: any[] };

      // Transform the results
      const jobs: Job[] = result.rows.map(job => ({
        id: job.id,
        title: job.title,
        job_description: job.job_description,
        employment_type: job.employment_type,
        skills: typeof job.skills === 'string' ? JSON.parse(job.skills) : job.skills,
        created_at: job.created_at,
        updated_at: job.updated_at,
        status: job.status,
        job_mode: job.job_mode,
        location: typeof job.location === 'string' ? JSON.parse(job.location) : job.location,
        experience_level: typeof job.experience_level === 'string' ? JSON.parse(job.experience_level) : job.experience_level,
        company_id: job.company_id,
        created_by_id: job.created_by_id
      }));

      return {
        jobs,
        total,
        page,
        limit
      };
    } catch (error) {
      console.error('Search jobs error:', error);
      throw new Error('Failed to search jobs');
    }
  }

  async reviewApplication(
    applicationId: string,
    jobId: string,
    profileId: string,
    status: 'selected' | 'rejected',
    reviewedBy: string
  ): Promise<ApplicationResponse> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      // Verify job belongs to profileId
      const jobQuery = `
        SELECT id, company_id
        FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
        LIMIT 1
      `;
      const jobResult = await client.query(jobQuery, [jobId, profileId]) as { rows: any[] };

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];
      if (job.company_id !== profileId) {
        throw new Error('Job does not belong to this business profile');
      }

      // Query job_applications for applicationId and verify it belongs to jobId
      const applicationQuery = `
        SELECT id, job_id, user_id, full_name, resume, phone, email, address, status, created_at, updated_at
        FROM "${config.DB_SCHEMA}".job_applications
        WHERE id = $1 AND job_id = $2
        LIMIT 1
      `;
      const applicationResult = await client.query(applicationQuery, [applicationId, jobId]) as { rows: any[] };

      if (applicationResult.rows.length === 0) {
        throw new Error('Application not found');
      }

      const existingApplication = applicationResult.rows[0];
      if (existingApplication.job_id !== jobId) {
        throw new Error('Application does not belong to this job');
      }

      // Validate that we're not trying to set the same status again
      const currentStatus = existingApplication.status;
      if (currentStatus === status) {
        if (status === 'selected') {
          throw new Error('Application is already selected');
        } else if (status === 'rejected') {
          throw new Error('Application is already rejected');
        }
      }

      // Update application status
      const updatedApplication = await this.updateApplicationStatus(applicationId, status, reviewedBy, client);

      await client.query('COMMIT');
      return updatedApplication;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateApplicationStatus(
    applicationId: string,
    status: 'selected' | 'rejected',
    reviewedBy: string,
    client?: any
  ): Promise<ApplicationResponse> {
    const dbClient = client || await database.getClient();
    const shouldReleaseClient = !client;

    try {
      // Build UPDATE query
      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".job_applications
        SET status = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      
      const updateResult = await dbClient.query(updateQuery, [status, reviewedBy, applicationId]) as { rows: any[] };
      
      if (updateResult.rows.length === 0) {
        throw new Error('Application not found');
      }

      const application = updateResult.rows[0];
      const resume = typeof application.resume === 'string' ? JSON.parse(application.resume) : application.resume;

      return {
        id: application.id,
        job_id: application.job_id,
        user_id: application.user_id,
        full_name: application.full_name,
        resume: resume,
        phone: application.phone,
        email: application.email,
        address: application.address,
        status: application.status,
        created_at: application.created_at.toISOString(),
        updated_at: application.updated_at.toISOString()
      };
    } finally {
      if (shouldReleaseClient) {
        dbClient.release();
      }
    }
  }
}

export const jobsService = new JobsService();
export default jobsService;

