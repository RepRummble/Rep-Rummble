import { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export interface PublicStats {
  userCount: number
  waitlistCount: number
  workoutCount: number
  reviewCount: number
  averageRating: number | null
}

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/stats`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setStats)
      .catch(() => {})
  }, [])

  return stats
}
