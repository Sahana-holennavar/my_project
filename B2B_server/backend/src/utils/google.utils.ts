import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { config } from '../config/env';

/**
 * Google OAuth Utility
 * Handles Google token verification and user data extraction
 */

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
  sub: string; // Google user ID
}

class GoogleAuthUtil {
  private client: OAuth2Client;

  constructor() {
    // Initialize Google OAuth2 client with credentials
    this.client = new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET
    );
  }

  /**
   * Verify Google ID token and extract user information
   * @param token - Google ID token from frontend
   * @returns Verified user data from Google
   * @throws Error if token is invalid or verification fails
   */
  async verifyGoogleToken(token: string): Promise<GoogleUserData> {
    try {
      // Verify the token with Google's servers
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: config.GOOGLE_CLIENT_ID, // Specify expected audience
      });

      // Extract payload from verified ticket
      const payload: TokenPayload | undefined = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }

      // Validate required claims
      this.validateTokenClaims(payload);

      // Extract and return user data
      return {
        email: payload.email!,
        name: payload.name || '',
        picture: payload.picture || '',
        email_verified: payload.email_verified || false,
        sub: payload.sub, // Google user ID
      };
    } catch (error: any) {
      console.error('Google token verification error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('Token used too late')) {
        throw new Error('Google token has expired');
      }
      if (error.message?.includes('Invalid token signature')) {
        throw new Error('Invalid Google token signature');
      }
      
      throw new Error('Failed to verify Google token');
    }
  }

  /**
   * Validate token claims (issuer, audience, expiry)
   * @param payload - Token payload to validate
   * @throws Error if validation fails
   */
  private validateTokenClaims(payload: TokenPayload): void {
    // Check if email exists
    if (!payload.email) {
      throw new Error('Email not found in token');
    }

    // Check if email is verified
    if (!payload.email_verified) {
      throw new Error('Email not verified by Google');
    }

    // Validate issuer (must be from Google)
    const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      throw new Error('Invalid token issuer');
    }

    // Validate audience (must match our client ID)
    if (payload.aud !== config.GOOGLE_CLIENT_ID) {
      throw new Error('Invalid token audience');
    }

    // Token expiry is automatically checked by verifyIdToken
  }

  /**
   * Check if Google OAuth is properly configured
   * @returns true if credentials are configured
   */
  isConfigured(): boolean {
    return !!(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  }
}

// Export singleton instance
export const googleAuthUtil = new GoogleAuthUtil();
