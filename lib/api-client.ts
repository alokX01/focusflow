import { FocusSession, UserSettings, FocusStats, AnalyticsData, User, DistractionEvent } from './models'

const API_BASE = '/api'

// Client-side API functions that work with the session
export const apiClient = {
  // User API
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE}/users/me`)
      if (!response.ok) return null
      const data = await response.json()
      return data.user
    } catch (error) {
      console.error('Error fetching current user:', error)
      return null
    }
  },

  // Settings API
  async getSettings(): Promise<UserSettings | null> {
    try {
      const response = await fetch(`${API_BASE}/settings`)
      if (!response.ok) return null
      const data = await response.json()
      return data.settings
    } catch (error) {
      console.error('Error fetching settings:', error)
      return null
    }
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!response.ok) return null
      const data = await response.json()
      return data.settings
    } catch (error) {
      console.error('Error updating settings:', error)
      return null
    }
  },

  // Sessions API
  async getSessions(limit = 50, offset = 0): Promise<FocusSession[]> {
    try {
      const response = await fetch(`${API_BASE}/sessions?limit=${limit}&offset=${offset}`)
      if (!response.ok) return []
      const data = await response.json()
      return data.sessions
    } catch (error) {
      console.error('Error fetching sessions:', error)
      return []
    }
  },

  async getSession(sessionId: string): Promise<FocusSession | null> {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`)
      if (!response.ok) return null
      const data = await response.json()
      return data.session
    } catch (error) {
      console.error('Error fetching session:', error)
      return null
    }
  },

  async createSession(sessionData: {
    targetDuration: number
    sessionType?: 'focus' | 'break' | 'long-break'
    cameraEnabled?: boolean
  }): Promise<FocusSession | null> {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
      if (!response.ok) return null
      const data = await response.json()
      return data.session
    } catch (error) {
      console.error('Error creating session:', error)
      return null
    }
  },

  async updateSession(sessionId: string, updates: Partial<FocusSession>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      return response.ok
    } catch (error) {
      console.error('Error updating session:', error)
      return false
    }
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      return response.ok
    } catch (error) {
      console.error('Error deleting session:', error)
      return false
    }
  },

  async addDistraction(sessionId: string, distraction: Omit<DistractionEvent, 'timestamp'>): Promise<DistractionEvent | null> {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/distractions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distraction)
      })
      if (!response.ok) return null
      const data = await response.json()
      return data.distraction
    } catch (error) {
      console.error('Error adding distraction:', error)
      return null
    }
  },

  // Analytics API
  async getStats(period: 'week' | 'month' | 'year' = 'week'): Promise<FocusStats | null> {
    try {
      const response = await fetch(`${API_BASE}/analytics?period=${period}`)
      if (!response.ok) return null
      const data = await response.json()
      return data.analytics
    } catch (error) {
      console.error('Error fetching analytics:', error)
      return null
    }
  },

  async getDaily(date?: string): Promise<AnalyticsData | null> {
    try {
      const url = date 
        ? `${API_BASE}/analytics/daily?date=${date}`
        : `${API_BASE}/analytics/daily`
      
      const response = await fetch(url)
      if (!response.ok) return null
      const data = await response.json()
      return data.dailyAnalytics
    } catch (error) {
      console.error('Error fetching daily analytics:', error)
      return null
    }
  }
}
