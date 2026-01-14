// Environment configuration with type safety
export const env = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  
  // WebSocket Configuration (optional - will be derived from API_URL if not set)
  WS_URL: process.env.NEXT_PUBLIC_WS_URL, // Optional: ws://localhost:5000

  // App Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Feature Flags
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const

// Validate required environment variables
const requiredEnvVars = [] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
