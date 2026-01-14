import { NextRequest, NextResponse } from 'next/server'
import { getRedirectUrl } from '@/config/routes'

/**
 * Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )

    if (!payload.exp) return true

    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime
  } catch {
    return true
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  const accessToken = req.cookies.get('access_token')?.value
  const isAuthenticated =
    !!accessToken && !isTokenExpired(accessToken)

  // 🔀 Decide redirect based on route rules
  const redirectPath = getRedirectUrl(pathname, isAuthenticated)

  // 🔐 Redirect handling
  if (redirectPath) {
    const redirectUrl = req.nextUrl.clone()

    // Preserve ?next= when redirecting to login
    if (!isAuthenticated && redirectPath.startsWith('/login')) {
      redirectUrl.pathname = redirectPath
      redirectUrl.search = `?next=${pathname}${search}`
    } else {
      redirectUrl.pathname = redirectPath
      redirectUrl.search = ''
    }

    const response = NextResponse.redirect(redirectUrl)

    // Clear expired tokens
    if (accessToken && isTokenExpired(accessToken)) {
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)|api).*)',
  ],
}
