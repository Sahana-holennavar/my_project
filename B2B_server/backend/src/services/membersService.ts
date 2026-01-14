import { database } from '../config/database';
import { config } from '../config/env';

interface RevokeMemberResult {
  userId: string;
  profileId: string;
  profileName: string;
  previousRole: string;
  revokedAt: string;
}

interface DemoteMemberResult {
  memberId: string;
  userId: string;
  profileId: string;
  profileName: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  demotedAt: string;
}

export class MembersService {
  async revokeMemberRole(userId: string, profileId: string): Promise<RevokeMemberResult> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const profileQuery = `
        SELECT owner_id, company_profile_data->>'companyName' as company_name
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;

      const profileResult = await client.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string; company_name: string }> };

      if (!profileResult.rows.length || !profileResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Business profile not found');
      }

      const profile = profileResult.rows[0];
      const profileName = profile.company_name || 'Unknown Company';

      if (profile.owner_id === userId) {
        await client.query('ROLLBACK');
        throw new Error('Profile owner cannot revoke their role');
      }

      const memberQuery = `
        SELECT id, user_id, company_page_id, role
        FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE company_page_id = $1 AND user_id = $2
        LIMIT 1
      `;

      const memberResult = await client.query(memberQuery, [profileId, userId]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string }> };

      if (!memberResult.rows.length || !memberResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Member record not found');
      }

      const member = memberResult.rows[0];

      const deleteQuery = `
        DELETE FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE id = $1
        RETURNING id, user_id, company_page_id, role
      `;

      await client.query(deleteQuery, [member.id]);

      await client.query('COMMIT');

      return {
        userId: member.user_id,
        profileId: member.company_page_id,
        profileName: profileName,
        previousRole: member.role,
        revokedAt: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async demoteMemberRole(userId: string, profileId: string): Promise<DemoteMemberResult> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const profileQuery = `
        SELECT owner_id, company_profile_data->>'companyName' as company_name
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;

      const profileResult = await client.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string; company_name: string }> };

      if (!profileResult.rows.length || !profileResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Business profile not found');
      }

      const profile = profileResult.rows[0];
      const profileName = profile.company_name || 'Unknown Company';

      if (profile.owner_id === userId) {
        await client.query('ROLLBACK');
        throw new Error('Profile owner cannot demote their role');
      }

      const memberQuery = `
        SELECT id, user_id, company_page_id, role
        FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE company_page_id = $1 AND user_id = $2
        LIMIT 1
      `;

      const memberResult = await client.query(memberQuery, [profileId, userId]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string }> };

      if (!memberResult.rows.length || !memberResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Member record not found');
      }

      const member = memberResult.rows[0];

      if (member.role !== 'admin') {
        await client.query('ROLLBACK');
        throw new Error('Cannot demote. Editor is the lowest role');
      }

      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".company_pages_members
        SET role = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, user_id, company_page_id, role, updated_at
      `;

      const updateResult = await client.query(updateQuery, ['editor', member.id]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string; updated_at: Date }> };

      if (!updateResult.rows.length || !updateResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to update member role');
      }

      await client.query('COMMIT');

      const updatedMember = updateResult.rows[0];

      return {
        memberId: updatedMember.id,
        userId: updatedMember.user_id,
        profileId: updatedMember.company_page_id,
        profileName: profileName,
        previousRole: 'admin',
        currentRole: 'editor',
        permissions: {
          canManagePosts: true,
          canManageProfile: false,
          canManagePages: false
        },
        demotedAt: updatedMember.updated_at.toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const membersService = new MembersService();
export default membersService;

