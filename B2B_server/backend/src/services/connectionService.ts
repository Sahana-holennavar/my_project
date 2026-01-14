import { database } from '../config/database';
import { config } from '../config/env';

class ConnectionService {
  /**
   * Fetch sent connection requests (from current user to others)
   * If notificationId is provided, fetch only that request; else fetch all
   */
  /**
   * Fetch sent connection requests (from current user to others)
   * If recipient is provided (email or UUID), fetch only those requests; else fetch all
   */
  async getSentConnectionRequests(senderId: string, recipient?: string): Promise<any> {
    try {
      let query = `SELECT n.id as notification_id, n.user_id as recipient_id, n.payload, n.type, n.read, n.created_at,
        (n.payload->>'from') as sender_id,
        u.email as recipient_email,
        up.role as recipient_role,
        up.profile_data->'personal_information'->>'first_name' as recipient_first_name,
        up.profile_data->'personal_information'->>'last_name' as recipient_last_name,
        up.profile_data->'avatar'->>'fileUrl' as recipient_profile_pic
        FROM "${config.DB_SCHEMA}".notifications n
        LEFT JOIN "${config.DB_SCHEMA}".users u ON u.id::text = n.user_id::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id::text = n.user_id::text
        WHERE n.type = 'connect_request' AND (n.payload->>'from') = $1`;
      const params: any[] = [senderId];
      if (recipient) {
        // If recipient is a valid UUID, match by user_id; else match by email
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(recipient)) {
          query += ' AND n.user_id = $2';
          params.push(recipient);
        } else {
          query += ' AND u.email = $2';
          params.push(recipient);
        }
      }
      query += ' ORDER BY n.created_at DESC';
      const result: any = await database.query(query, params);
      return (recipient ? result.rows : result.rows) || null;
    } catch (error) {
      console.error('Error fetching sent connection requests:', error);
      throw new Error('Failed to fetch sent connection requests');
    }
  }
  /**
   * Create a connect request notification for recipient
   */
  async createConnectRequest(senderId: string, recipientId: string): Promise<any> {
    try {
      // 1) Ensure recipient exists
      const findUser = `SELECT id FROM "${config.DB_SCHEMA}".users WHERE id = $1 LIMIT 1`;
      const userRes: any = await database.query(findUser, [recipientId]);
      if (!userRes.rows || userRes.rows.length === 0) {
        // Per controller logic, map to 404
        throw new Error('RECIPIENT_NOT_FOUND');
      }

      // 2) Check for duplicate pending/accepted connect_request from this sender
      const dupQuery = `SELECT id FROM "${config.DB_SCHEMA}".notifications
        WHERE user_id = $1 AND type = 'connect_request' AND (payload->>'from') = $2
        AND (payload->>'connect_request') IN ('pending', 'accepted') LIMIT 1`;
      const dupRes: any = await database.query(dupQuery, [recipientId, senderId]);
      if (dupRes.rows && dupRes.rows.length > 0) {
        throw new Error('DUPLICATE_REQUEST');
      }

      // 3) Insert notification with payload marking pending
      const payload = { from: senderId, connect_request: 'pending' };
      const content = 'You have a new connection request';

      const query = `INSERT INTO "${config.DB_SCHEMA}".notifications (user_id, content, payload, type, delivery_method)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`;

      // delivery_method must match DB constraint values (e.g. 'in_app' not 'in-app')
      const result: any = await database.query(query, [recipientId, content, payload, 'connect_request', 'in_app']);
      return result.rows ? result.rows[0] : null;
    } catch (error: any) {
      console.error('Error creating connect request:', error);
      // Bubble up known control errors (RECIPIENT_NOT_FOUND, DUPLICATE_REQUEST)
      if (error && (error.message === 'RECIPIENT_NOT_FOUND' || error.message === 'DUPLICATE_REQUEST')) {
        throw error;
      }
      throw new Error('Failed to create connect request');
    }
  }

  /**
   * Accept a connection request and create bi-directional connections
   */
  async acceptConnection(accepterId: string, senderId: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Find pending connection request notification
      const findNotificationQuery = `
        SELECT id, payload FROM "${config.DB_SCHEMA}".notifications 
        WHERE user_id = $1 AND type = 'connect_request' 
        AND (payload->>'from') = $2 
        AND (payload->>'connect_request') = 'pending'
        LIMIT 1
      `;
      const notificationResult: any = await client.query(findNotificationQuery, [accepterId, senderId]);
      
      if (!notificationResult.rows || notificationResult.rows.length === 0) {
        throw new Error('CONNECTION_REQUEST_NOT_FOUND');
      }

      // 2. Check if connection already exists (either direction)
      const checkConnectionQuery = `
        SELECT id FROM "${config.DB_SCHEMA}".connections 
        WHERE (user_id = $1 AND connected_id = $2) OR (user_id = $2 AND connected_id = $1)
        LIMIT 1
      `;
      const connectionResult: any = await client.query(checkConnectionQuery, [accepterId, senderId]);
      
      if (connectionResult.rows && connectionResult.rows.length > 0) {
        throw new Error('CONNECTION_ALREADY_EXISTS');
      }

      // 3. Update notification to mark as accepted
      const updateNotificationQuery = `
        UPDATE "${config.DB_SCHEMA}".notifications 
        SET payload = jsonb_set(payload, '{connect_request}', '"accepted"'), 
            read = true
        WHERE id = $1
      `;
      await client.query(updateNotificationQuery, [notificationResult.rows[0].id]);

      // 4. Create bi-directional connections
      const createConnectionQuery = `
        INSERT INTO "${config.DB_SCHEMA}".connections (user_id, connected_id, status, created_at, updated_at)
        VALUES ($1, $2, 'accepted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, user_id, connected_id, created_at, updated_at
      `;

      // Create first connection: accepter -> sender
      const connection1Result: any = await client.query(createConnectionQuery, [accepterId, senderId]);
      
      // Create second connection: sender -> accepter
      const connection2Result: any = await client.query(createConnectionQuery, [senderId, accepterId]);

      // 5. Create notification for the original sender that their request was accepted
      const notificationPayload = { from: accepterId, connect_request: 'accepted' };
      const notificationContent = 'Your connection request was accepted';
      const createNotificationQuery = `
        INSERT INTO "${config.DB_SCHEMA}".notifications (user_id, content, payload, type, delivery_method, read)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      await client.query(createNotificationQuery, [
        senderId,
        notificationContent,
        notificationPayload,
        'connection_accepted',
        'in_app',
        false
      ]);

      await client.query('COMMIT');

      // Return the first connection details
      return {
        connection_id: connection1Result.rows[0].id,
        user_id: connection1Result.rows[0].user_id,
        connected_id: connection1Result.rows[0].connected_id,
        created_at: connection1Result.rows[0].created_at,
        updated_at: connection1Result.rows[0].updated_at
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Re-throw known errors
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND' || 
          error.message === 'CONNECTION_ALREADY_EXISTS') {
        throw error;
      }
      
      console.error('Error accepting connection:', error);
      throw new Error('Failed to accept connection request');
    } finally {
      client.release();
    }
  }

  /**
   * Reject a connection request
   */
  async rejectConnection(userId: string, senderId: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Find PENDING connection request notification only
      const findNotificationQuery = `
        SELECT id, payload FROM "${config.DB_SCHEMA}".notifications 
        WHERE user_id = $1 AND type = 'connect_request' 
        AND (payload->>'from') = $2 
        AND (payload->>'connect_request') = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const notificationResult: any = await client.query(findNotificationQuery, [userId, senderId]);
      
      if (!notificationResult.rows || notificationResult.rows.length === 0) {
        throw new Error('CONNECTION_REQUEST_NOT_FOUND');
      }

      // 3. Update notification to mark as rejected
      const updateNotificationQuery = `
        UPDATE "${config.DB_SCHEMA}".notifications 
        SET payload = jsonb_set(payload, '{connect_request}', '"rejected"'), 
            read = true
        WHERE id = $1
        RETURNING id, payload, type, user_id, created_at
      `;
      const updateResult: any = await client.query(updateNotificationQuery, [notificationResult.rows[0].id]);

      await client.query('COMMIT');

      // Return the updated notification details
      return {
        notification_id: updateResult.rows[0].id,
        sender_id: senderId,
        recipient_id: userId,
        type: updateResult.rows[0].type,
        connect_request: 'rejected',
        updated_at: updateResult.rows[0].created_at
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Re-throw known errors
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND' || 
          error.message === 'CONNECTION_ALREADY_REJECTED') {
        throw error;
      }
      
      console.error('Error rejecting connection:', error);
      throw new Error('Failed to reject connection request');
    } finally {
      client.release();
    }
  }

  /**
   * Withdraw a pending connection request (delete notification)
   */
  async withdrawConnectionRequest(senderId: string, recipientId: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Find all pending connection request notifications
      const findNotificationQuery = `
        SELECT id, payload, created_at FROM "${config.DB_SCHEMA}".notifications 
        WHERE user_id = $1 
        AND type = 'connect_request' 
        AND (payload->>'from') = $2
        AND (payload->>'connect_request') = 'pending'
        ORDER BY created_at DESC
      `;
      console.log('Withdraw query params:', { recipientId, senderId, schema: config.DB_SCHEMA });
      const notificationResult: any = await client.query(findNotificationQuery, [recipientId, senderId]);
      console.log('Withdraw query result:', { found: notificationResult.rows.length, rows: notificationResult.rows });
      
      if (!notificationResult.rows || notificationResult.rows.length === 0) {
        throw new Error('CONNECTION_REQUEST_NOT_FOUND');
      }

      // 2. Delete ALL pending notifications (hard delete)
      const deleteNotificationQuery = `
        DELETE FROM "${config.DB_SCHEMA}".notifications 
        WHERE user_id = $1 
        AND type = 'connect_request' 
        AND (payload->>'from') = $2
        AND (payload->>'connect_request') = 'pending'
        RETURNING id, user_id, payload, type, created_at
      `;
      const deleteResult: any = await client.query(deleteNotificationQuery, [recipientId, senderId]);

      await client.query('COMMIT');

      // Return the deleted notifications details
      return {
        success: true,
        message: `Withdrew ${deleteResult.rows.length} pending connection request(s)`,
        deleted_count: deleteResult.rows.length,
        sender_id: senderId,
        recipient_id: recipientId,
        deleted_notifications: deleteResult.rows.map((row: any) => ({
          notification_id: row.id,
          created_at: row.created_at
        })),
        deleted_at: new Date().toISOString()
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Re-throw known errors
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND' || 
          error.message === 'CANNOT_WITHDRAW_ACCEPTED' ||
          error.message === 'CANNOT_WITHDRAW_REJECTED') {
        throw error;
      }
      
      console.error('Error withdrawing connection request:', error);
      throw new Error('Failed to withdraw connection request');
    } finally {
      client.release();
    }
  }

  /**
   * Fetch notifications for a user with pagination and filters
   */
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, status: string = 'all', type: string = 'connect_request') {
    try {
      const offset = (page - 1) * limit;

      // Support both connect_request and connection_accepted types
      const baseWhereClauses: string[] = [`n.user_id = $1`, `n.type IN ('connect_request', 'connection_accepted')`];
      const params: any[] = [userId];

      if (status && status !== 'all') {
        params.push(status);
        baseWhereClauses.push(`(n.payload->>'connect_request') = $${params.length}`);
      }

      const whereClause = baseWhereClauses.length > 0 ? `WHERE ${baseWhereClauses.join(' AND ')}` : '';

      // Main query: notifications with sender details (join user and user_profiles)
      const query = `SELECT n.id as notification_id, n.user_id as recipient_id, n.payload, n.type, n.read, n.created_at,
        (n.payload->>'from') as sender_id,
        u.email as sender_email,
        up.role as sender_role,
        up.profile_data->'personal_information'->>'first_name' as sender_first_name,
        up.profile_data->'personal_information'->>'last_name' as sender_last_name,
        up.profile_data->'avatar'->>'fileUrl' as sender_profile_pic
        FROM "${config.DB_SCHEMA}".notifications n
        LEFT JOIN "${config.DB_SCHEMA}".users u ON u.id::text = (n.payload->>'from')
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id::text = (n.payload->>'from')
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      params.push(limit, offset);

      const result: any = await database.query(query, params as any[]);

      // Counts
      const countParams = [userId];
      let countWhere = `WHERE n.user_id = $1 AND n.type IN ('connect_request', 'connection_accepted')`;
      if (status && status !== 'all') {
        countParams.push(status);
        countWhere += ` AND (n.payload->>'connect_request') = $${countParams.length}`;
      }

      const totalQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".notifications n ${countWhere}`;
      const totalRes: any = await database.query(totalQuery, countParams as any[]);
      const total = parseInt(totalRes.rows[0].count, 10) || 0;

      const unreadQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".notifications n WHERE n.user_id = $1 AND n.type IN ('connect_request', 'connection_accepted') AND n.read = FALSE`;
      const unreadRes: any = await database.query(unreadQuery, [userId]);
      const unread_count = parseInt(unreadRes.rows[0].count, 10) || 0;

      const pendingQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".notifications n WHERE n.user_id = $1 AND n.type = 'connect_request' AND (n.payload->>'connect_request') = 'pending'`;
      const pendingRes: any = await database.query(pendingQuery, [userId]);
      const pending_count = parseInt(pendingRes.rows[0].count, 10) || 0;

      // Map rows into expected shape
      const notifications = (result.rows || []).map((row: any) => ({
        notification_id: row.notification_id,
        sender_id: row.sender_id,
        recipient_id: row.recipient_id,
        sender_details: {
          id: row.sender_id,
          name: (row.sender_first_name || row.sender_last_name) ? `${row.sender_first_name || ''} ${row.sender_last_name || ''}`.trim() : null,
          email: row.sender_email || null,
          profile_pic: row.sender_profile_pic || null,
          role: row.sender_role || null
        },
        type: row.type,
        connect_request: row.payload && row.payload.connect_request ? row.payload.connect_request : (row.payload && row.payload.connect_request === undefined ? null : (row.payload && row.payload['connect_request']) ),
        message: row.payload && row.payload.message ? row.payload.message : null,
        is_read: row.read,
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at
      }));

      return { notifications, total, unread_count, pending_count };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Fetch user connections with pagination, search and optional filters
   */
  async fetchUserConnections(userId: string, page: number = 1, limit: number = 20, search?: string) {
    try {
      const offset = (page - 1) * limit;

      const params: any[] = [userId];
      let whereClause = `WHERE c.user_id = $1 AND c.status = 'accepted'`;

      if (search && search.trim().length > 0) {
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
        // search against first_name, last_name, email, company
        whereClause += ` AND (up.profile_data->'personal_information'->> 'first_name' ILIKE $${params.length - 2} OR up.profile_data->'personal_information'->> 'last_name' ILIKE $${params.length - 1} OR u.email ILIKE $${params.length})`;
      }

      // Main query: connections with connected user details
      const query = `SELECT c.id as connection_id, c.user_id, c.connected_id, c.created_at, c.updated_at,
        u.id as connected_user_id, u.email as connected_user_email,
        up.profile_data->'personal_information'->>'first_name' as first_name,
        up.profile_data->'personal_information'->>'last_name' as last_name,
        up.profile_data->'avatar'->>'fileUrl' as profile_pic,
        up.role as user_role
        FROM "${config.DB_SCHEMA}".connections c
        LEFT JOIN "${config.DB_SCHEMA}".users u ON u.id::text = c.connected_id::text
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id::text = c.connected_id::text
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

      params.push(limit, offset);

      const result: any = await database.query(query, params as any[]);

      // Total count
      const countQuery = `SELECT COUNT(*) FROM "${config.DB_SCHEMA}".connections c ${whereClause}`;
      const countParams = params.slice(0, params.length - 2);
      const totalRes: any = await database.query(countQuery, countParams as any[]);
      const total = parseInt(totalRes.rows[0].count, 10) || 0;

      const connections = (result.rows || []).map((row: any) => ({
        connection_id: row.connection_id,
        user_id: row.user_id,
        connected_id: row.connected_id,
        connected_user: {
          id: row.connected_user_id,
          name: (row.first_name || row.last_name) ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : null,
          email: row.connected_user_email || null,
          profile_pic: row.profile_pic || null,
          role : row.user_role || null,
        },
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      return { connections, total };
    } catch (error) {
      console.error('Error fetching user connections:', error);
      throw new Error('Failed to fetch user connections');
    }
  }

  /**
   * Get suggested users for connection (users not connected and no pending requests)
   * Returns random users each time
   */
  async getSuggestedUsers(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          u.id,
          u.email,
          up.role,
          up.profile_data->'personal_information'->>'first_name' as first_name,
          up.profile_data->'personal_information'->>'last_name' as last_name,
          up.profile_data->'avatar'->>'fileUrl' as profile_pic,
          up.profile_data->'professional_information'->>'headline' as headline,
          up.profile_data->'professional_information'->>'company_name' as company_name,
          up.created_at
        FROM "${config.DB_SCHEMA}".users u
        LEFT JOIN "${config.DB_SCHEMA}".user_profiles up ON up.user_id = u.id
        WHERE u.id != $1
        AND u.active = true
        -- Exclude users already connected (bidirectional)
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".connections c
          WHERE (c.user_id = $1 AND c.connected_id = u.id)
             OR (c.user_id = u.id AND c.connected_id = $1)
        )
        -- Exclude users with pending/accepted connection requests (sent by current user)
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".notifications n
          WHERE n.type = 'connect_request'
          AND (n.payload->>'from') = $1::text
          AND n.user_id = u.id
          AND (n.payload->>'connect_request') IN ('pending', 'accepted')
        )
        -- Exclude users who sent pending requests to current user
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".notifications n
          WHERE n.type = 'connect_request'
          AND n.user_id = $1
          AND (n.payload->>'from') = u.id::text
          AND (n.payload->>'connect_request') = 'pending'
        )
        ORDER BY RANDOM()
        LIMIT $2 OFFSET $3
      `;

      const result: any = await database.query(query, [userId, limit, offset]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(u.id) as total
        FROM "${config.DB_SCHEMA}".users u
        WHERE u.id != $1
        AND u.active = true
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".connections c
          WHERE (c.user_id = $1 AND c.connected_id = u.id)
             OR (c.user_id = u.id AND c.connected_id = $1)
        )
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".notifications n
          WHERE n.type = 'connect_request'
          AND (n.payload->>'from') = $1::text
          AND n.user_id = u.id
          AND (n.payload->>'connect_request') IN ('pending', 'accepted')
        )
        AND NOT EXISTS (
          SELECT 1 FROM "${config.DB_SCHEMA}".notifications n
          WHERE n.type = 'connect_request'
          AND n.user_id = $1
          AND (n.payload->>'from') = u.id::text
          AND (n.payload->>'connect_request') = 'pending'
        )
      `;

      const countResult: any = await database.query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      const users = result.rows.map((row: any) => ({
        user_id: row.id,
        email: row.email,
        name: (row.first_name || row.last_name) ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : null,
        first_name: row.first_name,
        last_name: row.last_name,
        profile_pic: row.profile_pic,
        role: row.role,
        headline: row.headline,
        company_name: row.company_name,
        created_at: row.created_at
      }));

      return {
        users,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      throw new Error('Failed to fetch suggested users');
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".notifications 
        SET read = true 
        WHERE id = $1 AND user_id = $2
        RETURNING id, read
      `;
      const result: any = await database.query(query, [notificationId, userId]);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('NOTIFICATION_NOT_FOUND');
      }
      
      return result.rows[0];
    } catch (error: any) {
      if (error.message === 'NOTIFICATION_NOT_FOUND') {
        throw error;
      }
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Check if two users are connected (bidirectional check)
   */
  async isUserConnected(userId: string, targetUserId: string) {
    try {
      const query = `SELECT id, user_id, connected_id, created_at FROM "${config.DB_SCHEMA}".connections c
        WHERE ((c.user_id = $1 AND c.connected_id = $2) OR (c.user_id = $2 AND c.connected_id = $1))
        AND c.status = 'accepted'
        LIMIT 1`;
      const result: any = await database.query(query, [userId, targetUserId]);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        return { is_connected: true, connection_id: row.id, connected_since: row.created_at };
      }

      return { is_connected: false };
    } catch (error) {
      console.error('Error checking connection status:', error);
      throw new Error('Failed to check connection status');
    }
  }

  /**
   * Remove/disconnect a connection (bidirectional removal)
   */
  async removeConnection(userId: string, connectedUserId: string): Promise<any> {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Check if connection exists (either direction)
      const checkConnectionQuery = `
        SELECT id, user_id, connected_id FROM "${config.DB_SCHEMA}".connections 
        WHERE ((user_id = $1 AND connected_id = $2) OR (user_id = $2 AND connected_id = $1))
        AND status = 'accepted'
      `;
      const connectionResult: any = await client.query(checkConnectionQuery, [userId, connectedUserId]);
      
      if (!connectionResult.rows || connectionResult.rows.length === 0) {
        throw new Error('CONNECTION_NOT_FOUND');
      }

      // 2. Delete both directions of the connection
      const deleteConnectionQuery = `
        DELETE FROM "${config.DB_SCHEMA}".connections 
        WHERE ((user_id = $1 AND connected_id = $2) OR (user_id = $2 AND connected_id = $1))
        AND status = 'accepted'
        RETURNING id
      `;
      const deleteResult: any = await client.query(deleteConnectionQuery, [userId, connectedUserId]);

      // 3. Update any related notifications to mark as disconnected (both directions)
      const updateNotificationQuery = `
        UPDATE "${config.DB_SCHEMA}".notifications 
        SET payload = jsonb_set(payload, '{connect_request}', '"disconnected"')
        WHERE type = 'connect_request'
        AND (payload->>'connect_request') = 'accepted'
        AND (
          (user_id::text = $1 AND (payload->>'from') = $2) 
          OR 
          (user_id::text = $2 AND (payload->>'from') = $1)
        )
      `;
      await client.query(updateNotificationQuery, [userId, connectedUserId]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Connection removed successfully',
        removed_connections: deleteResult.rows.length,
        user_id: userId,
        disconnected_user_id: connectedUserId
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Re-throw known errors
      if (error.message === 'CONNECTION_NOT_FOUND') {
        throw error;
      }
      
      console.error('Error removing connection:', error);
      throw new Error('Failed to remove connection');
    } finally {
      client.release();
    }
  }
}

export const connectionService = new ConnectionService();
export default connectionService;
