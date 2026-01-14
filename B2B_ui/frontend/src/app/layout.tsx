import type { Metadata } from 'next'
// Removed Google Fonts import - using system fonts instead
import './globals.css'
import { StoreProvider } from '@/store/provider'
import { AuthInitializer } from '@/components/auth/AuthInitializer'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { Navbar } from '@/components/common/Navbar'
import { NotificationProvider } from '@/components/providers/NotificationProvider'
import { SocketNotificationsWrapper } from '@/components/common/SocketNotificationsWrapper'
import { FloatingChallengeIcon } from '@/components/common/FloatingChallengeIcon'
import LoginContestPopup from '@/components/common/LoginContestPopup'
import { NotificationSummaryWrapper } from '@/components/common/NotificationSummaryWrapper'
import { ChatSocketProvider } from '@/components/providers/ChatSocketProvider'

// Using CSS variables for fonts - defined in globals.css
// No Google Fonts dependency

export const metadata: Metadata = {
  metadataBase: new URL('https://techvruk.com'),
  title: {
    default: 'Techvruk',
    template: '%s | Techvruk',
  },
  description:
    'Techvruk is the trusted platform for professionals to connect, discover opportunities, and stay ahead with curated insights.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Techvruk',
    siteName: 'Techvruk',
    description:
      'Techvruk helps professionals and businesses grow with curated insights, networking, and opportunities.',
    url: 'https://techvruk.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Techvruk',
    description:
      'Techvruk helps professionals and businesses grow with curated insights, networking, and opportunities.',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
            <body
        className={`antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <StoreProvider>
            <NotificationProvider position="top-right" maxVisible={3}>
              <AuthInitializer>
                <ChatSocketProvider>
                  <SocketNotificationsWrapper />
                  <NotificationSummaryWrapper />
                  <Navbar />
                  {children}
                  <FloatingChallengeIcon />
                  {/* Show contest popup after login */}
                  <LoginContestPopup />
                  <Toaster />
                </ChatSocketProvider>
              </AuthInitializer>
            </NotificationProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
