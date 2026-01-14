/**
 * Audit Logger Utility - Main audit logging functionality
 * Handles IP extraction, field-level change tracking, and batch processing
 */

import { Request } from 'express';
import { auditLoggerService } from '../services/auditLoggerService';
import { 
  CreateAuditLogData, 
  AuditEventType, 
  FieldChange, 
  ProfileChangeData,
  AuditLogResponse 
} from '../models/AuditLog';

class AuditLogger {
  /**
   * Extract IP address from request
   */
  private extractIPAddress(req: Request): string {

    // Try different headers in order of preference
    const ipSources = [
      req.headers['x-forwarded-for'] as string,  // Load balancer/proxy header (take first IP)
      req.headers['x-real-ip'] as string,        // Real IP header
      req.headers['x-client-ip'] as string,      // Client IP header
      req.headers['cf-connecting-ip'] as string, // Cloudflare IP header
      req.ip,                                    // Direct connection IP
      req.connection?.remoteAddress,             // Connection remote address
      req.socket?.remoteAddress,                 // Socket remote address
    ];

    for (const ip of ipSources) {
      if (ip && typeof ip === 'string' && ip.length > 0) {
        // Handle comma-separated IPs (take the first one)
        const ipString: string = ip;
        const parts = ipString.split(',');
        if (parts.length > 0 && parts[0]) {
          const cleanIP = parts[0].trim();
          if (this.isValidIP(cleanIP)) {
            return cleanIP;
          }
        }
      }
    }

    return 'unknown';
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    // Handle localhost addresses
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return true;
    }

    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    // IPv6 localhost
    const ipv6LocalhostRegex = /^::1$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ipv6LocalhostRegex.test(ip);
  }

  /**
   * Create audit log entry (fire-and-forget)
   */
  public async createAuditLog(
    event: AuditEventType,
    action: string,
    req: Request,
    userId?: string | null
  ): Promise<void> {
    try {
      const auditData: CreateAuditLogData = {
        event,
        user_id: userId || null,
        action,
        ip_address: this.extractIPAddress(req)
      };

      // Fire-and-forget: don't await to avoid blocking main operation
      auditLoggerService.addToBatch(auditData).catch(error => {
        console.error('Audit log creation failed:', error);
      });
    } catch (error) {
      console.error('Audit logger error:', error);
      // Don't throw error to avoid breaking main operation
    }
  }

  /**
   * Create audit log entry with custom IP address
   */
  public async createAuditLogWithIP(
    event: AuditEventType,
    action: string,
    ipAddress: string,
    userId?: string | null
  ): Promise<void> {
    try {
      const auditData: CreateAuditLogData = {
        event,
        user_id: userId || null,
        action,
        ip_address: ipAddress
      };

      // Fire-and-forget: don't await to avoid blocking main operation
      auditLoggerService.addToBatch(auditData).catch(error => {
        console.error('Audit log creation failed:', error);
      });
    } catch (error) {
      console.error('Audit logger error:', error);
      // Don't throw error to avoid breaking main operation
    }
  }

  /**
   * Track field-level changes for profile updates
   */
  public async trackProfileChanges(
    userId: string,
    oldData: any,
    newData: any,
    req: Request
  ): Promise<void> {
    try {
      const changes = this.detectFieldChanges(oldData, newData);
      
      if (changes.length === 0) {
        return; // No changes to log
      }

      // Create separate audit log for each significant field change
      for (const change of changes) {
        const action = `${change.field}: "${change.old_value}" → "${change.new_value}"`;
        
        await this.createAuditLog(
          'PROFILE_EDITED',
          action,
          req,
          userId
        );
      }
    } catch (error) {
      console.error('Profile change tracking error:', error);
    }
  }

  /**
   * Detect field changes between old and new data
   */
  private detectFieldChanges(oldData: any, newData: any): FieldChange[] {
    const changes: FieldChange[] = [];

    if (!oldData || !newData) {
      return changes;
    }

    // Define fields to track for profile changes
    const trackableFields = [
      'first_name', 'last_name', 'email', 'phone', 'company', 'position',
      'about', 'location', 'website', 'linkedin', 'twitter', 'github',
      'experience', 'education', 'skills', 'certifications'
    ];

    for (const field of trackableFields) {
      const oldValue = this.getNestedValue(oldData, field);
      const newValue = this.getNestedValue(newData, field);

      if (oldValue !== newValue && newValue !== undefined) {
        changes.push({
          field,
          old_value: oldValue || 'null',
          new_value: newValue
        });
      }
    }

    return changes;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Create audit log for authentication events
   */
  public async logAuthEvent(
    event: 'USER_LOGIN' | 'USER_REGISTERED' | 'LOGIN_FAILED' | 'PASSWORD_UPDATED' | 'ACCOUNT_DEACTIVATED' | 'ACCOUNT_DELETION' | 'TUTORIAL_STATUS_UPDATED' | 
          'ADMIN_LOGIN_SUCCESS' | 'ADMIN_LOGIN_FAILED' | 'ADMIN_LOGIN_DENIED' | 'ADMIN_LOGOUT' | 'ADMIN_TOKEN_REFRESHED' |
          'ADMIN_DASHBOARD_ACCESSED' | 'ADMIN_USERS_LIST_VIEWED' | 'ADMIN_USER_DETAILS_VIEWED' | 'ADMIN_USER_DEACTIVATED' | 'ADMIN_USER_REACTIVATED' |
          'ADMIN_AUDIT_LOGS_VIEWED' | 'ADMIN_ORGANIZATIONS_LIST_VIEWED' | 'ADMIN_ORGANIZATION_DETAILS_VIEWED' | 'ADMIN_CONTESTS_LIST_VIEWED' | 'ADMIN_CONTEST_DETAILS_VIEWED' | 
          'ADMIN_CONTEST_REGISTRATIONS_VIEWED' | 'ADMIN_CONTEST_SUBMISSION_VIEWED' | 'ADMIN_USERS_EXPORTED' | 'ADMIN_CONTESTS_EXPORTED' | 'ADMIN_ANALYTICS_VIEWED',
    action: string,
    req: Request,
    userId?: string | null
  ): Promise<void> {
    await this.createAuditLog(event, action, req, userId);
  }

  /**
   * Create audit log for profile events
   */
  public async logProfileEvent(
    event: 'PROFILE_CREATION' | 'USER_AVATAR_UPLOADED' | 'USER_BANNER_UPLOADED' | 'RESUME_UPLOADED',
    action: string,
    req: Request,
    userId: string
  ): Promise<void> {
    await this.createAuditLog(event, action, req, userId);
  }

  /**
   * Create audit log for post events
   */
  public async logPostEvent(
    event: 'POST_CREATED' | 'POST_UPDATED',
    action: string,
    req: Request,
    userId: string
  ): Promise<void> {
    await this.createAuditLog(event, action, req, userId);
  }

  /**
   * Create audit log for interaction events
   */
  public async logInteractionEvent(
    event: 'POST_LIKED' | 'POST_DISLIKED' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'POST_SHARE' | 'POST_REPORTED' | 'POST_SAVED' | 'POST_UNSAVED',
    action: string,
    req: Request,
    userId: string
  ): Promise<void> {
    await this.createAuditLog(event, action, req, userId);
  }

  /**
   * Create audit log for failed login attempts
   */
  public async logFailedLogin(
    email: string,
    reason: string,
    req: Request
  ): Promise<void> {
    const action = `Failed login attempt for email: ${email}. Reason: ${reason}`;
    await this.createAuditLog('LOGIN_FAILED', action, req, null);
  }

  /**
   * Create audit log for password updates
   */
  public async logPasswordUpdate(
    userId: string,
    req: Request
  ): Promise<void> {
    const action = 'Password updated successfully';
    await this.createAuditLog('PASSWORD_UPDATED', action, req, userId);
  }

  /**
   * Create audit log for account deactivation
   */
  public async logAccountDeactivation(
    userId: string,
    req: Request
  ): Promise<void> {
    const action = 'Account deactivated by user';
    await this.createAuditLog('ACCOUNT_DEACTIVATED', action, req, userId);
  }

  /**
   * Create audit log for account deletion
   */
  public async logAccountDeletion(
    userId: string,
    req: Request
  ): Promise<void> {
    const action = 'Account deleted by user';
    await this.createAuditLog('ACCOUNT_DELETION', action, req, userId);
  }

  /**
   * Create audit log for profile creation
   */
  public async logProfileCreation(
    userId: string,
    role: string,
    req: Request
  ): Promise<void> {
    const action = `Profile created for role: ${role}`;
    await this.createAuditLog('PROFILE_CREATION', action, req, userId);
  }

  public async logCompanyProfileCreation(
    userId: string,
    companyName: string,
    req: Request
  ): Promise<void> {
    const action = `Company profile created: ${companyName}`;
    await this.createAuditLog('COMPANY_PROFILE_CREATED', action, req, userId);
  }

  /**
   * Create audit log for file uploads
   */
  public async logFileUpload(
    event: 'USER_AVATAR_UPLOADED' | 'USER_BANNER_UPLOADED' | 'RESUME_UPLOADED',
    userId: string,
    fileName: string,
    fileSize: number,
    req: Request
  ): Promise<void> {
    const action = `File uploaded: ${fileName} (${fileSize} bytes)`;
    await this.createAuditLog(event, action, req, userId);
  }

  /**
   * Create audit log for post creation
   */
  public async logPostCreation(
    userId: string,
    postId: string,
    postType: string,
    req: Request
  ): Promise<void> {
    const action = `Post created: ${postId} (type: ${postType})`;
    await this.createAuditLog('POST_CREATED', action, req, userId);
  }

  /**
   * Create audit log for post updates
   */
  public async logPostUpdate(
    userId: string,
    postId: string,
    changes: string[],
    req: Request
  ): Promise<void> {
    const action = `Post updated: ${postId}. Changes: ${changes.join(', ')}`;
    await this.createAuditLog('POST_UPDATED', action, req, userId);
  }

  /**
   * Create audit log for post interactions
   */
  public async logPostInteraction(
    event: 'POST_LIKED' | 'POST_DISLIKED' | 'COMMENT_POST' | 'REPLY_COMMENT' | 'POST_SHARE' | 'POST_REPORTED' | 'POST_SAVED' | 'POST_UNSAVED',
    userId: string,
    postId: string,
    additionalInfo?: string,
    req?: Request
  ): Promise<void> {
    const action = `Post ${event.toLowerCase().replace('_', ' ')}: ${postId}${additionalInfo ? ` - ${additionalInfo}` : ''}`;
    
    if (req) {
      await this.createAuditLog(event, action, req, userId);
    } else {
      // For cases where Request object is not available
      await this.createAuditLogWithIP(event, action, 'system', userId);
    }
  }

  /**
   * Create audit log for project creation
   */
  public async logProjectCreation(
    userId: string,
    profileId: string,
    projectId: string,
    req: Request
  ): Promise<void> {
    const action = `Project created for business profile: ${profileId}, project: ${projectId}`;
    await this.createAuditLog('PROJECT_CREATED', action, req, userId);
  }

  /**
   * Create audit log for projects access
   */
  public async logProjectsAccess(
    userId: string,
    profileId: string,
    req: Request
  ): Promise<void> {
    const action = `Projects accessed for business profile: ${profileId}`;
    await this.createAuditLog('PROJECTS_ACCESSED', action, req, userId);
  }

  /**
   * Create audit log for project update
   */
  public async logProjectUpdate(
    userId: string,
    profileId: string,
    projectId: string,
    req: Request
  ): Promise<void> {
    const action = `Project updated for business profile: ${profileId}, project: ${projectId}`;
    await this.createAuditLog('PROJECT_UPDATED', action, req, userId);
  }

  /**
   * Create audit log for project deletion
   */
  public async logProjectDeletion(
    userId: string,
    profileId: string,
    projectId: string,
    req: Request
  ): Promise<void> {
    const action = `Project deleted for business profile: ${profileId}, project: ${projectId}`;
    await this.createAuditLog('PROJECT_DELETED', action, req, userId);
  }

  /**
   * Create audit log for private info access
   */
  public async logPrivateInfoAccess(
    userId: string,
    profileId: string,
    req: Request
  ): Promise<void> {
    const action = `Private info accessed for business profile: ${profileId}`;
    await this.createAuditLog('PRIVATE_INFO_ACCESSED', action, req, userId);
  }

  /**
   * Create audit log for private info creation
   */
  public async logPrivateInfoCreation(
    userId: string,
    profileId: string,
    req: Request
  ): Promise<void> {
    const action = `Private info created for business profile: ${profileId}`;
    await this.createAuditLog('PRIVATE_INFO_CREATED', action, req, userId);
  }

  /**
   * Create audit log for private info update
   */
  public async logPrivateInfoUpdate(
    userId: string,
    profileId: string,
    req: Request
  ): Promise<void> {
    const action = `Private info updated for business profile: ${profileId}`;
    await this.createAuditLog('PRIVATE_INFO_UPDATED', action, req, userId);
  }

  /**
   * Create audit log for private info deletion
   */
  public async logPrivateInfoDeletion(
    userId: string,
    profileId: string,
    req: Request
  ): Promise<void> {
    const action = `Private info deleted for business profile: ${profileId}`;
    await this.createAuditLog('PRIVATE_INFO_DELETED', action, req, userId);
  }
}

export const auditLogger = new AuditLogger();
export default auditLogger;
