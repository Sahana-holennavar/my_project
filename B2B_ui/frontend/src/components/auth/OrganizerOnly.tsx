'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'

interface OrganizerOnlyProps {
  children: React.ReactNode
  redirectTo?: string
}

const ALLOWED_ORGANIZER_IDS = [
  '5d0c28fb-2d00-4fc9-b4f1-d84af699f12b',
  '3c6b22d7-401a-4ce5-85a7-bd951b20e6c2'
]

export function OrganizerOnly({ children, redirectTo = '/' }: OrganizerOnlyProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    if (!ALLOWED_ORGANIZER_IDS.includes(user.id)) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, user, router, redirectTo])

  // Don't render anything until we verify the user is an organizer
  if (!isAuthenticated || !user || !ALLOWED_ORGANIZER_IDS.includes(user.id)) {
    return null
  }

  return <>{children}</>
}
