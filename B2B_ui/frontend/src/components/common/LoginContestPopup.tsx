'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAppSelector } from '@/store/hooks'
import { contestApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { Contest } from '@/types/challenge'

export default function LoginContestPopup() {
  const router = useRouter()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [open, setOpen] = useState(false)
  const [contest, setContest] = useState<Contest | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    // When user becomes authenticated, fetch latest contest and show popup once
    const run = async () => {
      if (!isAuthenticated || shown) return
      try {
        // Use single contest endpoint for the specific contest ID
        const CONTEST_ID = '35933017-3d90-476d-a913-9398af26ce84'
        
        // First check if user has already registered or submitted
        const statusRes = await contestApi.getContestStatus(CONTEST_ID)
        if (statusRes.success && statusRes.data) {
          const { has_registered, has_submitted } = statusRes.data
          // Don't show popup if user already registered or submitted
          if (has_registered || has_submitted) {
            console.log('[LoginContestPopup] User already participated, not showing popup')
            setShown(true)
            return
          }
        }
        
        // Now fetch contest details
        const res = await contestApi.getContest(CONTEST_ID)
        if (res.success && res.data) {
          const contest = res.data
          
          // Check if contest is active and today is within the date range
          const now = new Date()
          const startTime = new Date(contest.start_time)
          const endTime = new Date(contest.end_time)
          
          const isActive = contest.status === 'active'
          const isWithinDateRange = now >= startTime && now <= endTime
          
          // Only show popup if contest is active AND today is within the valid date range
          if (isActive && isWithinDateRange) {
            setContest(contest)
            setOpen(true)
            setShown(true)
          } else {
            console.log('[LoginContestPopup] Contest not shown:', {
              status: contest.status,
              isActive,
              isWithinDateRange,
              startTime: contest.start_time,
              endTime: contest.end_time,
              now: now.toISOString()
            })
          }
        }
      } catch (e) {
        // ignore fetch errors silently
        console.warn('LoginContestPopup: failed to fetch contest', e)
      }
    }

    run()
  }, [isAuthenticated, shown])

  const handleGo = () => {
    if (!contest) return
    setOpen(false)
    router.push(`/challenge`)
  }

  if (!contest) return null

  // Poster is a direct string URL from the API
  const posterUrl = contest.poster || null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-lg ">
        <DialogHeader>
          <DialogTitle>{contest.title || 'New Contest'}</DialogTitle>
          <DialogDescription className="mt-2">
            {posterUrl ? (
              <div className="w-full rounded-lg flex items-center justify-center">
                <Image
                  src={posterUrl}
                  alt={`${contest.title || 'Contest'} poster`}
                  width={800}
                  height={520}
                  className="w-full max-h-130 object-contain"
                />
              </div>
            ) : contest.problem_statement ? (
              contest.problem_statement.substring(0, 200) + '...'
            ) : (
              'New challenge is live. Click to view and participate.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={handleGo}>View Challenge</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
