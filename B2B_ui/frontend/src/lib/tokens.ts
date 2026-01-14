import { AuthTokens } from '@/types/auth'

// Token storage using cookies (client-side storage)
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRES_IN: 'expires_in',
} as const

/**
 * Decode JWT token payload
 * WARNING: This does NOT verify the signature - only use for reading claims
 */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export const tokenStorage = {
  // Set tokens in cookies
  setAuthTokens: (tokens: AuthTokens, rememberMe = false): void => {
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 30 days or 1 day
    const expires = new Date(Date.now() + maxAge).toUTCString()
    
    // Set cookies with secure flags
    const cookieOptions = `expires=${expires}; path=/; SameSite=Lax`

    // URL encode the tokens to handle special characters safely
    document.cookie = `${TOKEN_KEYS.ACCESS_TOKEN}=${encodeURIComponent(tokens.access_token)}; ${cookieOptions}`
    document.cookie = `${TOKEN_KEYS.REFRESH_TOKEN}=${encodeURIComponent(tokens.refresh_token)}; ${cookieOptions}`
    document.cookie = `${TOKEN_KEYS.EXPIRES_IN}=${tokens.expires_in}; ${cookieOptions}`
  },

  // Get tokens from cookies
  getStoredTokens: (): AuthTokens | null => {
    if (typeof document === 'undefined') return null
    
    // Parse cookies properly - handle encoded values
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim()
      const firstEquals = trimmed.indexOf('=')
      if (firstEquals > 0) {
        const key = trimmed.substring(0, firstEquals)
        const value = trimmed.substring(firstEquals + 1)
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)

    const accessToken = cookies[TOKEN_KEYS.ACCESS_TOKEN]
    const refreshToken = cookies[TOKEN_KEYS.REFRESH_TOKEN]
    const expiresIn = cookies[TOKEN_KEYS.EXPIRES_IN]

    if (!accessToken || !refreshToken) {
      console.warn('⚠️ Missing tokens in cookies')
      return null
    }

    // Decode the URL-encoded tokens
    return {
      access_token: decodeURIComponent(accessToken),
      refresh_token: decodeURIComponent(refreshToken),
      expires_in: parseInt(expiresIn) || 3600,
    }
  },

  // Decode and get user data from access token
  getUserFromToken: (): Record<string, unknown> | null => {
    const tokens = tokenStorage.getStoredTokens()
    if (!tokens?.access_token) return null
    
    const payload = decodeJWT(tokens.access_token)
    return payload
  },

  // Clear tokens
  clearTokens: (): void => {
    const expiredDate = new Date(0).toUTCString()
    const cookieOptions = `expires=${expiredDate}; path=/; SameSite=Lax`
    
    document.cookie = `${TOKEN_KEYS.ACCESS_TOKEN}=; ${cookieOptions}`
    document.cookie = `${TOKEN_KEYS.REFRESH_TOKEN}=; ${cookieOptions}`
    document.cookie = `${TOKEN_KEYS.EXPIRES_IN}=; ${cookieOptions}`
  },

  // Check if tokens are expired
  isTokenExpired: (): boolean => {
    const tokens = tokenStorage.getStoredTokens()
    if (!tokens) return true
    
    const payload = decodeJWT(tokens.access_token)
    if (!payload || !payload.exp) return true
    
    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    const expirationTime = (payload.exp as number) * 1000
    const isExpired = Date.now() >= expirationTime
    
    return isExpired
  },
}
