import { database } from '../config/database';
import { config } from '../config/env';

interface DeactivateBusinessPageResult {
  profileId: string;
  profileName: string;
  isActive: boolean;
  deactivatedAt: string;
}

interface PageMember {
  memberId: string;
  userId: string;
  role: string;
  name: string;
  avatar: string | null;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  joinedAt: string;
}

interface GetAllPageMembersResult {
  members: PageMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface PromoteMemberResult {
  memberId: string;
  userId: string;
  profileId: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  promotedAt: string;
}

interface DemoteMemberResult {
  memberId: string;
  userId: string;
  profileId: string;
  previousRole: string;
  currentRole: string;
  permissions: {
    canManagePosts: boolean;
    canManageProfile: boolean;
    canManagePages: boolean;
  };
  demotedAt: string;
}

interface RemoveMemberResult {
  memberId: string;
  userId: string;
  profileId: string;
  removedAt: string;
}

interface DeleteBusinessProfileResult {
  profileId: string;
  profileName: string;
  deletedAt: string;
}

interface ReactivateBusinessProfileResult {
  profileId: string;
  profileName: string;
  isActive: boolean;
  reactivatedAt: string;
}

function getPermissionsByRole(role: string): { canManagePosts: boolean; canManageProfile: boolean; canManagePages: boolean } {
  if (role === 'owner' || role === 'admin') {
    return {
      canManagePosts: true,
      canManageProfile: true,
      canManagePages: true
    };
  }
  return {
    canManagePosts: true,
    canManageProfile: false,
    canManagePages: false
  };
}

export class OwnerService {
  async deactivateBusinessPage(profileId: string, userId: string): Promise<DeactivateBusinessPageResult> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const profileQuery = `
        SELECT owner_id, company_profile_data->>'companyName' as company_name, is_active
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;

      const profileResult = await client.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string; company_name: string; is_active: boolean }> };

      if (!profileResult.rows.length || !profileResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Business profile not found');
      }

      const profile = profileResult.rows[0];
      const profileName = profile.company_name || 'Unknown Company';

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can deactivate the business page');
      }

      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".company_pages
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING is_active, updated_at
      `;

      const updateResult = await client.query(updateQuery, [false, profileId]) as { rows: Array<{ is_active: boolean; updated_at: Date }> };

      if (!updateResult.rows.length || !updateResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to deactivate business page');
      }

      await client.query('COMMIT');

      return {
        profileId: profileId,
        profileName: profileName,
        isActive: false,
        deactivatedAt: updateResult.rows[0].updated_at.toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllPageMembers(profileId: string, page: number, limit: number): Promise<GetAllPageMembersResult> {
    const client = await database.getClient();

    try {
      const profileQuery = `
        SELECT owner_id, company_profile_data->>'companyName' as company_name, created_at
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;

      const profileResult = await client.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string; company_name: string; created_at: Date }> };

      if (!profileResult.rows.length || !profileResult.rows[0]) {
        throw new Error('Business profile not found');
      }

      const profile = profileResult.rows[0];
      const ownerId = profile.owner_id;
      const pageCreatedAt = profile.created_at;

      const membersQuery = `
        SELECT 
          cpm.id as member_id,
          cpm.user_id,
          cpm.role,
          cpm.created_at,
          up.profile_data
        FROM "${config.DB_SCHEMA}".company_pages_members cpm
        JOIN "${config.DB_SCHEMA}".user_profiles up ON cpm.user_id = up.user_id
        WHERE cpm.company_page_id = $1 AND cpm.user_id != $2
        ORDER BY 
          CASE cpm.role
            WHEN 'admin' THEN 1
            WHEN 'editor' THEN 2
            ELSE 3
          END,
          cpm.created_at ASC
      `;

      const membersResult = await client.query(membersQuery, [profileId, ownerId]) as { rows: Array<{ member_id: string; user_id: string; role: string; created_at: Date; profile_data: any }> };

      const ownerProfileQuery = `
        SELECT profile_data
        FROM "${config.DB_SCHEMA}".user_profiles
        WHERE user_id = $1
        LIMIT 1
      `;

      const ownerProfileResult = await client.query(ownerProfileQuery, [ownerId]) as { rows: Array<{ profile_data: any }> };

      const allMembers: PageMember[] = [];

      if (ownerProfileResult.rows.length && ownerProfileResult.rows[0]) {
        const ownerProfile = ownerProfileResult.rows[0].profile_data;
        const personalInfo = ownerProfile?.personal_information || {};
        const firstName = personalInfo?.first_name || '';
        const lastName = personalInfo?.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || 'Unknown';
        const avatar = ownerProfile?.avatar?.fileUrl || null;

        allMembers.push({
          memberId: ownerId,
          userId: ownerId,
          role: 'owner',
          name: name,
          avatar: avatar,
          permissions: getPermissionsByRole('owner'),
          joinedAt: pageCreatedAt.toISOString()
        });
      }

      for (const member of membersResult.rows) {
        const profileData = member.profile_data || {};
        const personalInfo = profileData?.personal_information || {};
        const firstName = personalInfo?.first_name || '';
        const lastName = personalInfo?.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || 'Unknown';
        const avatar = profileData?.avatar?.fileUrl || null;

        allMembers.push({
          memberId: member.member_id,
          userId: member.user_id,
          role: member.role,
          name: name,
          avatar: avatar,
          permissions: getPermissionsByRole(member.role),
          joinedAt: member.created_at.toISOString()
        });
      }

      const total = allMembers.length;
      const offset = (page - 1) * limit;
      const paginatedMembers = allMembers.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        members: paginatedMembers,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          hasMore: hasMore
        }
      };
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }

  async promoteMember(profileId: string, memberId: string, userId: string): Promise<PromoteMemberResult> {
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

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can promote members');
      }

      const memberQuery = `
        SELECT id, user_id, company_page_id, role
        FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE id = $1 AND company_page_id = $2
        LIMIT 1
      `;

      const memberResult = await client.query(memberQuery, [memberId, profileId]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string }> };

      if (!memberResult.rows.length || !memberResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      if (member.role !== 'editor') {
        await client.query('ROLLBACK');
        throw new Error('Can only promote members with editor role');
      }

      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".company_pages_members
        SET role = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, user_id, company_page_id, role, updated_at
      `;

      const updateResult = await client.query(updateQuery, ['admin', member.id]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string; updated_at: Date }> };

      if (!updateResult.rows.length || !updateResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to promote member');
      }

      await client.query('COMMIT');

      const updatedMember = updateResult.rows[0];

      return {
        memberId: updatedMember.id,
        userId: updatedMember.user_id,
        profileId: updatedMember.company_page_id,
        previousRole: 'editor',
        currentRole: 'admin',
        permissions: getPermissionsByRole('admin'),
        promotedAt: updatedMember.updated_at.toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async demoteMember(profileId: string, memberId: string, userId: string): Promise<DemoteMemberResult> {
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

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can demote members');
      }

      const memberQuery = `
        SELECT id, user_id, company_page_id, role
        FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE id = $1 AND company_page_id = $2
        LIMIT 1
      `;

      const memberResult = await client.query(memberQuery, [memberId, profileId]) as { rows: Array<{ id: string; user_id: string; company_page_id: string; role: string }> };

      if (!memberResult.rows.length || !memberResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      if (member.role !== 'admin') {
        await client.query('ROLLBACK');
        throw new Error('Can only demote members with admin role');
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
        throw new Error('Failed to demote member');
      }

      await client.query('COMMIT');

      const updatedMember = updateResult.rows[0];

      return {
        memberId: updatedMember.id,
        userId: updatedMember.user_id,
        profileId: updatedMember.company_page_id,
        previousRole: 'admin',
        currentRole: 'editor',
        permissions: getPermissionsByRole('editor'),
        demotedAt: updatedMember.updated_at.toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async removeMember(profileId: string, memberId: string, userId: string): Promise<RemoveMemberResult> {
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
      const ownerId = profile.owner_id;

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can remove members');
      }

      if (memberId === ownerId) {
        await client.query('ROLLBACK');
        throw new Error('Cannot remove the profile owner');
      }

      const memberQuery = `
        SELECT id, user_id, company_page_id
        FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE id = $1 AND company_page_id = $2
        LIMIT 1
      `;

      const memberResult = await client.query(memberQuery, [memberId, profileId]) as { rows: Array<{ id: string; user_id: string; company_page_id: string }> };

      if (!memberResult.rows.length || !memberResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Member not found');
      }

      const member = memberResult.rows[0];

      const deleteQuery = `
        DELETE FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE id = $1
        RETURNING id, user_id, company_page_id
      `;

      const deleteResult = await client.query(deleteQuery, [member.id]) as { rows: Array<{ id: string; user_id: string; company_page_id: string }> };

      if (!deleteResult.rows.length || !deleteResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to remove member');
      }

      await client.query('COMMIT');

      return {
        memberId: member.id,
        userId: member.user_id,
        profileId: member.company_page_id,
        removedAt: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteBusinessProfile(profileId: string, userId: string): Promise<DeleteBusinessProfileResult> {
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

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can delete the business profile');
      }

      // First delete all members associated with this company page
      const deleteMembersQuery = `
        DELETE FROM "${config.DB_SCHEMA}".company_pages_members
        WHERE company_page_id = $1
      `;
      await client.query(deleteMembersQuery, [profileId]);

      // Then delete the company page itself
      const deleteProfileQuery = `
        DELETE FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        RETURNING id
      `;

      const deleteResult = await client.query(deleteProfileQuery, [profileId]) as { rows: Array<{ id: string }> };

      if (!deleteResult.rows.length || !deleteResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to delete business profile');
      }

      await client.query('COMMIT');

      return {
        profileId: profileId,
        profileName: profileName,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reactivateBusinessProfile(profileId: string, userId: string): Promise<ReactivateBusinessProfileResult> {
    const client = await database.getClient();

    try {
      await client.query('BEGIN');

      const profileQuery = `
        SELECT owner_id, company_profile_data->>'companyName' as company_name, is_active
        FROM "${config.DB_SCHEMA}".company_pages
        WHERE id = $1
        LIMIT 1
      `;

      const profileResult = await client.query(profileQuery, [profileId]) as { rows: Array<{ owner_id: string; company_name: string; is_active: boolean }> };

      if (!profileResult.rows.length || !profileResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Business profile not found');
      }

      const profile = profileResult.rows[0];
      const profileName = profile.company_name || 'Unknown Company';

      if (profile.owner_id !== userId) {
        await client.query('ROLLBACK');
        throw new Error('Only profile owner can reactivate the business profile');
      }

      if (profile.is_active) {
        await client.query('ROLLBACK');
        throw new Error('Business profile is already active');
      }

      const updateQuery = `
        UPDATE "${config.DB_SCHEMA}".company_pages
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING is_active, updated_at
      `;

      const updateResult = await client.query(updateQuery, [true, profileId]) as { rows: Array<{ is_active: boolean; updated_at: Date }> };

      if (!updateResult.rows.length || !updateResult.rows[0]) {
        await client.query('ROLLBACK');
        throw new Error('Failed to reactivate business profile');
      }

      await client.query('COMMIT');

      return {
        profileId: profileId,
        profileName: profileName,
        isActive: true,
        reactivatedAt: updateResult.rows[0].updated_at.toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const ownerService = new OwnerService();
export default ownerService;

