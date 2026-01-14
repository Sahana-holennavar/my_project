import { database } from '../config/database';
import { config } from '../config/env';
import { CreateApplicationData, JobApplication, ApplicationResponse, ApplicationWithUserDetails, JobInfo, PaginationMetadata, ApplicationWithJobDetails, GetUserApplicationsResponse, UpdateApplicationData } from '../models/Application';
import { uploadJobApplicationResume } from './s3Service';
import fs from 'fs';

export class ApplicationsService {
  async applyForJob(
    jobId: string,
    userId: string,
    applicationData: CreateApplicationData,
    resumeFile?: Express.Multer.File
  ): Promise<ApplicationResponse> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      const jobQuery = `
        SELECT id, status, company_id
        FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1
        LIMIT 1
      `;
      const jobResult = await client.query(jobQuery, [jobId]) as { rows: any[] };

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];
      if (job.status !== 'active') {
        throw new Error('Job is not active. Applications are only accepted for active jobs.');
      }

      if (!resumeFile) {
        throw new Error('Resume file is required');
      }

      const existingApplicationQuery = `
        SELECT id, status
        FROM "${config.DB_SCHEMA}".job_applications
        WHERE job_id = $1 AND user_id = $2
        LIMIT 1
      `;
      const existingResult = await client.query(existingApplicationQuery, [jobId, userId]) as { rows: any[] };

      let applicationId: string | undefined;
      let isUpdate = false;

      if (existingResult.rows.length > 0) {
        const existingApp = existingResult.rows[0];
        if (existingApp.status === 'applied' || existingApp.status === 'selected') {
          throw new Error('You have already applied for this job');
        }
        if (existingApp.status === 'rejected') {
          applicationId = existingApp.id;
          isUpdate = true;
        } else {
          applicationId = existingApp.id;
          isUpdate = true;
        }
      }

      const resumeUploadResult = await uploadJobApplicationResume(resumeFile.path, userId, resumeFile.originalname);
      const resumeData = {
        file_name: resumeFile.originalname,
        file_url: resumeUploadResult.fileUrl
      };

      let application: any;

      if (isUpdate && applicationId) {
        const updateQuery = `
          UPDATE "${config.DB_SCHEMA}".job_applications
          SET full_name = $1,
              phone = $2,
              email = $3,
              address = $4,
              resume = $5,
              status = 'applied',
              updated_at = CURRENT_TIMESTAMP,
              reviewed_at = NULL,
              reviewed_by = NULL
          WHERE id = $6
          RETURNING *
        `;
        const updateResult = await client.query(updateQuery, [
          applicationData.full_name,
          applicationData.phone,
          applicationData.email,
          applicationData.address,
          JSON.stringify(resumeData),
          applicationId
        ]) as { rows: any[] };
        application = updateResult.rows[0];
      } else {
        const insertQuery = `
          INSERT INTO "${config.DB_SCHEMA}".job_applications (
            job_id,
            user_id,
            full_name,
            phone,
            email,
            address,
            resume,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'applied', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        const insertResult = await client.query(insertQuery, [
          jobId,
          userId,
          applicationData.full_name,
          applicationData.phone,
          applicationData.email,
          applicationData.address,
          JSON.stringify(resumeData)
        ]) as { rows: any[] };
        application = insertResult.rows[0];
      }

      await client.query('COMMIT');

      if (resumeFile.path && fs.existsSync(resumeFile.path)) {
        fs.unlinkSync(resumeFile.path);
      }

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
    } catch (error) {
      await client.query('ROLLBACK');
      if (resumeFile?.path && fs.existsSync(resumeFile.path)) {
        try {
          fs.unlinkSync(resumeFile.path);
        } catch (cleanupError) {
          console.error('Error cleaning up resume file:', cleanupError);
        }
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to submit application');
    } finally {
      client.release();
    }
  }

  async getJobApplications(
    jobId: string,
    profileId: string,
    filters: { status?: string },
    pagination: { page: number; limit: number }
  ): Promise<{ applications: any[]; total: number; jobInfo: JobInfo }> {
    try {
      const jobQuery = `
        SELECT id, title, company_id, status
        FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
        LIMIT 1
      `;
      const jobResult = await database.query(jobQuery, [jobId, profileId]) as { rows: any[] };

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found or does not belong to this business profile');
      }

      const job = jobResult.rows[0];
      const status = filters.status || 'applied';
      const offset = (pagination.page - 1) * pagination.limit;

      const applicationsQuery = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.full_name,
          ja.resume,
          ja.phone,
          ja.email,
          ja.address,
          ja.status,
          ja.created_at,
          ja.updated_at,
          u.email as user_email,
          up.profile_data->'personal_information'->>'first_name' as first_name,
          up.profile_data->'personal_information'->>'last_name' as last_name,
          up.profile_data->'avatar'->>'fileUrl' as profile_picture,
          up.role as user_type
        FROM "${config.DB_SCHEMA}".job_applications ja
        LEFT JOIN "${config.DB_SCHEMA}".users u ON ja.user_id = u.id
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON ja.user_id = up.user_id
        WHERE ja.job_id = $1 AND ja.status = $2
        ORDER BY ja.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM "${config.DB_SCHEMA}".job_applications
        WHERE job_id = $1 AND status = $2
      `;

      const totalCountQuery = `
        SELECT COUNT(*) as total
        FROM "${config.DB_SCHEMA}".job_applications
        WHERE job_id = $1
      `;

      const applicationsResult = await database.query(applicationsQuery, [jobId, status, pagination.limit, offset]) as { rows: any[] };
      const countResult = await database.query(countQuery, [jobId, status]) as { rows: any[] };
      const totalCountResult = await database.query(totalCountQuery, [jobId]) as { rows: any[] };

      const total = parseInt(countResult.rows[0].total, 10);
      const totalApplications = parseInt(totalCountResult.rows[0].total, 10);

      const jobInfo: JobInfo = {
        id: job.id,
        title: job.title,
        company_id: job.company_id,
        status: job.status,
        total_applications: totalApplications
      };

      return {
        applications: applicationsResult.rows,
        total,
        jobInfo
      };
    } catch (error) {
      console.error('Get job applications error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve job applications');
    }
  }

  getApplicationsWithUserDetails(rawApplications: any[]): ApplicationWithUserDetails[] {
    return rawApplications.map((row) => {
      const resume = typeof row.resume === 'string' ? JSON.parse(row.resume) : row.resume;
      const resumeUrl = resume?.file_url || null;

      const firstName = row.first_name || '';
      const lastName = row.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || row.full_name;

      return {
        id: row.id,
        job_id: row.job_id,
        user_id: row.user_id,
        resume_url: resumeUrl,
        phone: row.phone,
        email: row.email || row.user_email,
        status: row.status,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        applicant: {
          user_id: row.user_id,
          name: fullName,
          email: row.user_email || row.email,
          profile_picture: row.profile_picture || null,
          user_type: row.user_type || null
        }
      };
    });
  }

  async getUserApplications(
    userId: string,
    filters: { status?: string },
    pagination: { page: number; limit: number }
  ): Promise<{ applications: ApplicationWithJobDetails[]; total: number }> {
    try {
      const status = filters.status;
      const offset = (pagination.page - 1) * pagination.limit;

      let whereClause = 'ja.user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND ja.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const applicationsQuery = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.resume,
          ja.phone,
          ja.email,
          ja.status,
          ja.created_at,
          ja.updated_at,
          j.id as job_id_val,
          j.title,
          j.company_id,
          j.status as job_status,
          j.job_description,
          j.employment_type,
          j.job_mode,
          j.location,
          cp.company_profile_data->>'companyName' as company_name,
          cp.company_profile_data->'company_logo'->>'fileUrl' as company_logo
        FROM "${config.DB_SCHEMA}".job_applications ja
        INNER JOIN "${config.DB_SCHEMA}".Jobs j ON ja.job_id = j.id
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON j.company_id = cp.id
        WHERE ${whereClause}
        ORDER BY ja.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(pagination.limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM "${config.DB_SCHEMA}".job_applications ja
        WHERE ${whereClause}
      `;

      const applicationsResult = await database.query(applicationsQuery, params) as { rows: any[] };
      const countResult = await database.query(countQuery, params.slice(0, paramIndex - 1)) as { rows: any[] };

      const total = parseInt(countResult.rows[0].total, 10);

      const applications: ApplicationWithJobDetails[] = applicationsResult.rows.map((row) => {
        const resume = typeof row.resume === 'string' ? JSON.parse(row.resume) : row.resume;
        const resumeUrl = resume?.file_url || '';

        return {
          id: row.id,
          job_id: row.job_id,
          user_id: row.user_id,
          resume: resumeUrl,
          phone: row.phone,
          email: row.email,
          status: row.status,
          created_at: row.created_at.toISOString(),
          updated_at: row.updated_at.toISOString(),
          job: {
            id: row.job_id_val,
            title: row.title,
            company_id: row.company_id,
            company_name: row.company_name || 'Unknown Company',
            company_logo: row.company_logo || null,
            status: row.job_status,
            job_description: row.job_description,
            employment_type: row.employment_type,
            job_mode: row.job_mode,
            location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location
          }
        };
      });

      return {
        applications,
        total
      };
    } catch (error) {
      console.error('Get user applications error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve user applications');
    }
  }

  async getApplicationById(applicationId: string, userId: string): Promise<ApplicationWithJobDetails> {
    try {
      const query = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.resume,
          ja.phone,
          ja.email,
          ja.status,
          ja.created_at,
          ja.updated_at,
          j.id as job_id_val,
          j.title,
          j.company_id,
          j.status as job_status,
          j.job_description,
          j.employment_type,
          j.job_mode,
          j.location,
          cp.company_profile_data->>'companyName' as company_name,
          cp.company_profile_data->'company_logo'->>'fileUrl' as company_logo
        FROM "${config.DB_SCHEMA}".job_applications ja
        INNER JOIN "${config.DB_SCHEMA}".Jobs j ON ja.job_id = j.id
        LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON j.company_id = cp.id
        WHERE ja.id = $1
        LIMIT 1
      `;

      const result = await database.query(query, [applicationId]) as { rows: any[] };

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      const row = result.rows[0];

      if (row.user_id !== userId) {
        throw new Error('Unauthorized access - You can only view your own applications');
      }

      const resume = typeof row.resume === 'string' ? JSON.parse(row.resume) : row.resume;
      const resumeUrl = resume?.file_url || '';

      return {
        id: row.id,
        job_id: row.job_id,
        user_id: row.user_id,
        resume: resumeUrl,
        phone: row.phone,
        email: row.email,
        status: row.status,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        job: {
          id: row.job_id_val,
          title: row.title,
          company_id: row.company_id,
          company_name: row.company_name || 'Unknown Company',
          company_logo: row.company_logo || null,
          status: row.job_status,
          job_description: row.job_description,
          employment_type: row.employment_type,
          job_mode: row.job_mode,
          location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location
        }
      };
    } catch (error) {
      console.error('Get application by id error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve application');
    }
  }

  async updateApplication(
    applicationId: string,
    userId: string,
    updateData: UpdateApplicationData,
    resumeFile?: Express.Multer.File
  ): Promise<ApplicationResponse> {
    const client = await database.getClient();
    try {
      await client.query('BEGIN');

      const existingQuery = `
        SELECT id, user_id, status, resume
        FROM "${config.DB_SCHEMA}".job_applications
        WHERE id = $1
        LIMIT 1
      `;
      const existingResult = await client.query(existingQuery, [applicationId]) as { rows: any[] };

      if (existingResult.rows.length === 0) {
        throw new Error('Application not found');
      }

      const existing = existingResult.rows[0];

      if (existing.user_id !== userId) {
        throw new Error('Unauthorized access - You can only update your own applications');
      }

      if (existing.status !== 'applied') {
        throw new Error('Cannot edit application after it has been reviewed');
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (resumeFile) {
        const resumeUploadResult = await uploadJobApplicationResume(resumeFile.path, userId, resumeFile.originalname);
        const resumeData = {
          file_name: resumeFile.originalname,
          file_url: resumeUploadResult.fileUrl
        };
        updateFields.push(`resume = $${paramIndex}`);
        updateValues.push(JSON.stringify(resumeData));
        paramIndex++;
      }

      if (updateData.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex}`);
        updateValues.push(updateData.phone);
        paramIndex++;
      }

      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(updateData.email);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(applicationId);

      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".job_applications
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, updateValues) as { rows: any[] };
      await client.query('COMMIT');

      if (resumeFile?.path && fs.existsSync(resumeFile.path)) {
        fs.unlinkSync(resumeFile.path);
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
    } catch (error) {
      await client.query('ROLLBACK');
      if (resumeFile?.path && fs.existsSync(resumeFile.path)) {
        try {
          fs.unlinkSync(resumeFile.path);
        } catch (cleanupError) {
          console.error('Error cleaning up resume file:', cleanupError);
        }
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update application');
    } finally {
      client.release();
    }
  }

  async revokeApplication(applicationId: string, userId: string): Promise<{ deleted: boolean; application_id: string; job_id: string; job_title: string }> {
    try {
      const query = `
        SELECT 
          ja.id,
          ja.job_id,
          ja.user_id,
          ja.status,
          j.title as job_title
        FROM "${config.DB_SCHEMA}".job_applications ja
        INNER JOIN "${config.DB_SCHEMA}".Jobs j ON ja.job_id = j.id
        WHERE ja.id = $1
        LIMIT 1
      `;
      const result = await database.query(query, [applicationId]) as { rows: any[] };

      if (result.rows.length === 0) {
        throw new Error('Application not found');
      }

      const application = result.rows[0];

      if (application.user_id !== userId) {
        throw new Error('Unauthorized access - You can only revoke your own applications');
      }

      if (application.status !== 'applied') {
        throw new Error(`Cannot revoke application after it has been reviewed (status: ${application.status})`);
      }

      const deleteQuery = `
        DELETE FROM "${config.DB_SCHEMA}".job_applications
        WHERE id = $1
      `;
      await database.query(deleteQuery, [applicationId]);

      return {
        deleted: true,
        application_id: application.id,
        job_id: application.job_id,
        job_title: application.job_title
      };
    } catch (error) {
      console.error('Revoke application error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to revoke application');
    }
  }

  async getApplicationResume(
    applicationId: string,
    jobId: string,
    profileId: string
  ): Promise<{
    resume_url: string;
    filename: string;
    content_type: string;
    uploaded_at: string;
    applicant_name: string;
  }> {
    try {
      const jobQuery = `
        SELECT id, company_id
        FROM "${config.DB_SCHEMA}".Jobs
        WHERE id = $1 AND company_id = $2
        LIMIT 1
      `;
      const jobResult = await database.query(jobQuery, [jobId, profileId]) as { rows: any[] };

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found or does not belong to this business profile');
      }

      const applicationQuery = `
        SELECT
          ja.id,
          ja.job_id,
          ja.full_name,
          ja.resume,
          ja.created_at
        FROM "${config.DB_SCHEMA}".job_applications ja
        WHERE ja.id = $1
        LIMIT 1
      `;
      const applicationResult = await database.query(applicationQuery, [applicationId]) as { rows: any[] };

      if (applicationResult.rows.length === 0) {
        throw new Error('Application not found');
      }

      const application = applicationResult.rows[0];

      if (application.job_id !== jobId) {
        throw new Error('Application does not belong to this job');
      }

      const resume = typeof application.resume === 'string' ? JSON.parse(application.resume) : application.resume;

      if (!resume || !resume.file_url) {
        throw new Error('Resume not found');
      }

      const fileName = resume.file_name || 'resume';
      const fileExtension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
      
      let contentType = 'application/octet-stream';
      if (fileExtension === '.pdf') {
        contentType = 'application/pdf';
      } else if (fileExtension === '.doc') {
        contentType = 'application/msword';
      } else if (fileExtension === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      return {
        resume_url: resume.file_url,
        filename: fileName,
        content_type: contentType,
        uploaded_at: application.created_at.toISOString(),
        applicant_name: application.full_name
      };
    } catch (error) {
      console.error('Get application resume error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve application resume');
    }
  }
}

export const applicationsService = new ApplicationsService();

