import { config } from '../config/env';
import { database } from '../config/database';
import { socketService } from './SocketService';
import {
  BusinessProfileNotFoundError,
  InvitationNotFoundError,
} from './business-profileService';

export { InvitationNotFoundError };

export class InvitationAlreadyAcceptedError extends Error {
  constructor() {
    super('Invitation has already been accepted');
    this.name = 'InvitationAlreadyAcceptedError';
  }
}

export class InvitationAlreadyDeclinedError extends Error {
  constructor() {
    super('Invitation has already been declined');
    this.name = 'InvitationAlreadyDeclinedError';
  }
}

export class InvitationNotForUserError extends Error {
  constructor() {
    super('Forbidden. You are not the recipient of this invitation');
    this.name = 'InvitationNotForUserError';
  }
}

class InvitationsService {
  private async assertBusinessProfileExists(profileId: string): Promise<void> {
    const query = `
      SELECT id
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;
    const result = await database.query(query, [profileId]) as { rows: Array<{ id: string }> };
    if (!result.rows.length) {
      throw new BusinessProfileNotFoundError();
    }
  }

  private async getCompanyProfileInfo(profileId: string): Promise<{ name: string; logo?: string; description?: string } | null> {
    const query = `
      SELECT company_profile_data
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;
    const result = await database.query(query, [profileId]) as {
      rows: Array<{ company_profile_data: any }>;
    };
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0]!;
    const companyData = typeof row.company_profile_data === 'string'
      ? JSON.parse(row.company_profile_data)
      : row.company_profile_data;
    const name = companyData.companyName || companyData.company_name || 'Unknown Company';
    const logo = companyData.company_logo?.fileUrl || companyData.companyLogo?.fileUrl || undefined;
    const description = companyData.description || companyData.companyDescription || undefined;
    return { name, logo, description };
  }

  private async getUserProfileInfo(userId: string): Promise<{ name: string; email: string; avatar?: string } | null> {
    const query = `
      SELECT u.email, up.profile_data
      FROM "${config.DB_SCHEMA}".users u
      LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
      LIMIT 1
    `;
    const result = await database.query(query, [userId]) as {
      rows: Array<{ email: string; profile_data?: any }>;
    };
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0]!;
    const profileData = row.profile_data || {};
    const firstName = profileData.firstName || profileData.first_name || profileData.personal_information?.first_name || '';
    const lastName = profileData.lastName || profileData.last_name || profileData.personal_information?.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || row.email;
    const avatar = profileData.avatar?.fileUrl || profileData.profilePicture?.fileUrl || profileData.profile_picture?.fileUrl || undefined;
    return {
      name,
      email: row.email,
      avatar,
    };
  }

  public async acceptInvitationService(
    invitationId: string,
    userId: string,
    profileId: string
  ): Promise<any> {
    await this.assertBusinessProfileExists(profileId);
    const client = await database.getClient();
    try {
      await client.query('BEGIN');
      const findInvitationQuery = `
        SELECT id, user_id, payload
        FROM "${config.DB_SCHEMA}".notifications
        WHERE id = $1
          AND type = 'business_profile_invitation'
          AND payload->>'profileId' = $2
        LIMIT 1
      `;
      const invitationResult: any = await client.query(findInvitationQuery, [invitationId, profileId]);
      if (!invitationResult.rows || invitationResult.rows.length === 0) {
        throw new InvitationNotFoundError();
      }
      const invitation = invitationResult.rows[0];
      if (invitation.user_id !== userId) {
        throw new InvitationNotForUserError();
      }
      const payload = typeof invitation.payload === 'string' ? JSON.parse(invitation.payload) : invitation.payload;
      if (payload.status !== 'pending') {
        if (payload.status === 'accepted') {
          throw new InvitationAlreadyAcceptedError();
        }
        if (payload.status === 'declined') {
          throw new InvitationAlreadyDeclinedError();
        }
        throw new Error('Invitation is not in pending status');
      }
      const role = payload.role;
      const invitedBy = payload.invitedBy?.userId || null;
      const updatedPayload = {
        ...payload,
        status: 'accepted',
      };
      const updateNotificationQuery = `
        UPDATE "${config.DB_SCHEMA}".notifications
        SET payload = $1::jsonb,
            read = true
        WHERE id = $2
      `;
      await client.query(updateNotificationQuery, [JSON.stringify(updatedPayload), invitationId]);
      const insertMemberQuery = `
        INSERT INTO "${config.DB_SCHEMA}".company_pages_members (company_page_id, user_id, role, invited_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, company_page_id, user_id, role, created_at
      `;
      const memberResult: any = await client.query(insertMemberQuery, [profileId, userId, role, invitedBy]);
      await client.query('COMMIT');
      const member = memberResult.rows[0];
      const companyInfo = await this.getCompanyProfileInfo(profileId);
      const inviterInfo = invitedBy ? await this.getUserProfileInfo(invitedBy) : null;
      const ownerQuery = `
        SELECT owner_id
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;
      const ownerResult: any = await database.query(ownerQuery, [profileId]);
      const ownerId = ownerResult.rows[0]?.owner_id;
      if (ownerId) {
        const socketPayload = {
          invitationId,
          memberId: member.id,
          userId,
          profileId,
          profileName: companyInfo?.name || 'Unknown Company',
          role,
          acceptedAt: new Date().toISOString(),
        };
        socketService.sendToUser(ownerId, 'invitation_accepted', socketPayload);
      }
      return {
        memberId: member.id,
        userId: member.user_id,
        profileId: member.company_page_id,
        profileName: companyInfo?.name || 'Unknown Company',
        role: member.role,
        invitedBy: {
          userId: invitedBy || '',
          name: inviterInfo?.name || '',
        },
        joinedAt: member.created_at,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error instanceof InvitationNotFoundError ||
          error instanceof InvitationNotForUserError ||
          error instanceof InvitationAlreadyAcceptedError ||
          error instanceof InvitationAlreadyDeclinedError ||
          error instanceof BusinessProfileNotFoundError) {
        throw error;
      }
      console.error('Accept invitation error:', error);
      throw new Error('Failed to accept invitation');
    } finally {
      client.release();
    }
  }

  public async declineInvitationService(
    invitationId: string,
    userId: string,
    profileId: string
  ): Promise<any> {
    await this.assertBusinessProfileExists(profileId);
    const query = `
      SELECT id, user_id, payload
      FROM "${config.DB_SCHEMA}".notifications
      WHERE id = $1
        AND type = 'business_profile_invitation'
        AND payload->>'profileId' = $2
      LIMIT 1
    `;
    const result = await database.query(query, [invitationId, profileId]) as {
      rows: Array<{ id: string; user_id: string; payload: any }>;
    };
    if (result.rows.length === 0) {
      throw new InvitationNotFoundError();
    }
    const row = result.rows[0]!;
    if (row.user_id !== userId) {
      throw new InvitationNotForUserError();
    }
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    if (payload.status !== 'pending') {
      if (payload.status === 'accepted') {
        throw new InvitationAlreadyAcceptedError();
      }
      if (payload.status === 'declined') {
        throw new InvitationAlreadyDeclinedError();
      }
      throw new Error('Invitation is not in pending status');
    }
    const updatedPayload = {
      ...payload,
      status: 'declined',
    };
    const updateQuery = `
      UPDATE "${config.DB_SCHEMA}".notifications
      SET payload = $1::jsonb,
          read = true
      WHERE id = $2
      RETURNING id
    `;
    const updateResult = await database.query(updateQuery, [JSON.stringify(updatedPayload), invitationId]) as {
      rows: Array<{ id: string }>;
    };
    if (updateResult.rows.length === 0) {
      throw new Error('Failed to decline invitation');
    }
    const companyInfo = await this.getCompanyProfileInfo(profileId);
    const ownerQuery = `
      SELECT owner_id
      FROM "${config.DB_SCHEMA}".company_pages
      WHERE id = $1
      LIMIT 1
    `;
    const ownerResult: any = await database.query(ownerQuery, [profileId]);
    const ownerId = ownerResult.rows[0]?.owner_id;
    if (ownerId) {
      const socketPayload = {
        invitationId,
        profileId,
        profileName: companyInfo?.name || 'Unknown Company',
        declinedAt: new Date().toISOString(),
      };
      socketService.sendToUser(ownerId, 'invitation_declined', socketPayload);
    }
    return {
      invitationId,
      profileName: companyInfo?.name || 'Unknown Company',
      status: 'declined',
      declinedAt: new Date().toISOString(),
    };
  }

  public async getInvitationsByUser(
    userId: string,
    status: string = 'pending'
  ): Promise<any> {
    let statusFilter = '';
    const params: any[] = [userId];
    if (status && status !== 'all') {
      params.push(status);
      statusFilter = `AND payload->>'status' = $2`;
    }
    const query = `
      SELECT 
        n.id as invitation_id,
        n.user_id,
        n.content,
        n.payload,
        n.created_at,
        cp.id as profile_id,
        cp.company_profile_data
      FROM "${config.DB_SCHEMA}".notifications n
      LEFT JOIN "${config.DB_SCHEMA}".company_pages cp ON (n.payload->>'profileId')::uuid = cp.id
      WHERE n.user_id = $1
        AND n.type = 'business_profile_invitation'
        ${statusFilter}
      ORDER BY n.created_at DESC
    `;
    const result: any = await database.query(query, params);
    const invitations = [];
    for (const row of result.rows) {
      const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      const companyData = typeof row.company_profile_data === 'string'
        ? JSON.parse(row.company_profile_data)
        : (row.company_profile_data || {});
      const profileName = companyData.companyName || companyData.company_name || 'Unknown Company';
      const profileLogo = companyData.avatar?.fileUrl || companyData.companyLogo?.fileUrl || undefined;
      const profileDescription = companyData.description || companyData.companyDescription || undefined;
      const invitedBy = payload.invitedBy || {};
      invitations.push({
        invitationId: row.invitation_id,
        profileId: row.profile_id,
        profileName,
        profileLogo,
        profileDescription,
        role: payload.role,
        status: payload.status,
        invitedBy: {
          userId: invitedBy.userId,
          name: invitedBy.name,
          email: invitedBy.email,
          avatar: invitedBy.avatar,
        },
        message: row.content,
        createdAt: row.created_at,
      });
    }
    const summaryQuery = `
      SELECT 
        payload->>'status' as status,
        COUNT(*) as count
      FROM "${config.DB_SCHEMA}".notifications
      WHERE user_id = $1
        AND type = 'business_profile_invitation'
      GROUP BY payload->>'status'
    `;
    const summaryResult: any = await database.query(summaryQuery, [userId]);
    const summary: any = {
      pending: 0,
      accepted: 0,
      declined: 0,
    };
    summaryResult.rows.forEach((row: any) => {
      if (row.status && summary.hasOwnProperty(row.status)) {
        summary[row.status] = parseInt(row.count, 10);
      }
    });
    return {
      invitations,
      total: invitations.length,
      summary,
    };
  }
}

export const invitationsService = new InvitationsService();
export default invitationsService;

