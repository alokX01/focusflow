'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { FocusStats, AnalyticsData } from '@/lib/models'

interface UseAnalyticsReturn {
  stats: FocusStats | null
  dailyData: AnalyticsData | null
  loading: boolean
  error: string | null
  refreshStats: (period?: 'week' | 'month' | 'year') => Promise<void>
  refreshDaily: (date?: string) => Promise<void>
}

export function useAnalytics(): UseAnalyticsReturn {
  const [stats, setStats] = useState<FocusStats | null>(null)
  const [dailyData, setDailyData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStats = useCallback(async (period: 'week' | 'month' | 'year' = 'week') => {
    try {
      setLoading(true)
      setError(null)

      const analyticsData = await apiClient.getStats(period)
      setStats(analyticsData)
    } catch (err) {
      setError('Failed to fetch analytics')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshDaily = useCallback(async (date?: string) => {
    try {
      setLoading(true)
      setError(null)

      const daily = await apiClient.getDaily(date)
      setDailyData(daily)
    } catch (err) {
      setError('Failed to fetch daily data')
      console.error('Error fetching daily data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial data
  useEffect(() => {
    refreshStats()
    refreshDaily()
  }, [refreshStats, refreshDaily])

  return {
    stats,
    dailyData,
    loading,
    error,
    refreshStats,
    refreshDaily
  }
}
