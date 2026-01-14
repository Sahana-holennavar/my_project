import { randomInt } from 'crypto';
import { config } from '../config/env';
import { database } from '../config/database';

class OTPService {
  /**
   * Generate 6-digit OTP
   * Comment: Required for password reset OTP generation
   */
  generateOTP(): string {
    try {
      // Generate 6-digit random number using crypto.randomInt(100000, 999999)
      const otpNumber = randomInt(100000, 999999);
      // Convert to string and pad with zeros if needed
      return otpNumber.toString().padStart(6, '0');
    } catch (error) {
      console.error('OTP generation error:', error);
      throw new Error('OTP generation failed');
    }
  }

  /**
   * Save OTP to database
   * Comment: Required for storing OTP with expiry time
   */
  async saveOTPToDatabase(userId: string, otp: string, expiryTime: Date): Promise<void> {
    try {
      // Invalidate any existing unused OTPs for user
      const invalidateQuery = `
        UPDATE "${config.DB_SCHEMA}".password_reset_otps 
        SET used_at = NOW() 
        WHERE user_id = $1 AND used_at IS NULL
      `;
      await database.query(invalidateQuery, [userId]);

      // Create new record in password_reset_otps
      const insertQuery = `
        INSERT INTO "${config.DB_SCHEMA}".password_reset_otps (user_id, otp, expires_at)
        VALUES ($1, $2, $3)
      `;
      await database.query(insertQuery, [userId, otp, expiryTime]);
    } catch (error) {
      console.error('OTP save error:', error);
      throw new Error('Database error during OTP save');
    }
  }

  /**
   * Validate OTP
   * Comment: Required for OTP verification before password reset
   */
  async validateOTP(userId: string, otp: string): Promise<{ valid: boolean; otpId: string | null; message: string }> {
    try {
      const query = `
        SELECT id, expires_at, used_at
        FROM "${config.DB_SCHEMA}".password_reset_otps
        WHERE user_id = $1 AND otp = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await database.query(query, [userId, otp]);
      
      if ((result as any).rows.length === 0) {
        return { valid: false, otpId: null, message: 'OTP is incorrect' };
      }

      const otpRecord = (result as any).rows[0];
      
      // Check if OTP is expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        return { valid: false, otpId: null, message: 'OTP has expired. Please request a new one' };
      }

      // Check if OTP is already used
      if (otpRecord.used_at !== null) {
        return { valid: false, otpId: null, message: 'This OTP has already been used' };
      }

      return { valid: true, otpId: otpRecord.id, message: 'OTP is valid' };
    } catch (error) {
      console.error('OTP validation error:', error);
      throw new Error('Database error during OTP validation');
    }
  }

  /**
   * Mark OTP as used
   * Comment: Required after successful password reset
   */
  async markOTPAsUsed(otpId: string): Promise<void> {
    try {
      const query = `
        UPDATE "${config.DB_SCHEMA}".password_reset_otps 
        SET used_at = NOW() 
        WHERE id = $1
      `;
      await database.query(query, [otpId]);
    } catch (error) {
      console.error('OTP mark as used error:', error);
      throw new Error('Database error during OTP usage marking');
    }
  }

  /**
   * Cleanup expired OTPs
   * Comment: Required for database maintenance
   */
  async cleanupExpiredOTPs(): Promise<{ count: number }> {
    try {
      const query = `
        DELETE FROM "${config.DB_SCHEMA}".password_reset_otps 
        WHERE expires_at < NOW() AND used_at IS NULL
      `;
      const result = await database.query(query);
      return { count: (result as any).rowCount || 0 };
    } catch (error) {
      console.error('OTP cleanup error:', error);
      throw new Error('Database error during OTP cleanup');
    }
  }
}

export const otpService = new OTPService();
export default otpService;
