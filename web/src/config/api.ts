import { supabase } from './supabase'
import { DEV_BYPASS_AUTH } from './devAuth'

// API Base URL - uses proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Get auth token from Supabase session
async function getAuthToken(): Promise<string | null> {
  // Dev-only shortcut (never enabled in production builds); the server only honours it outside production too.
  if (DEV_BYPASS_AUTH) return 'dev-bypass-token'
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// API request helper
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const token = await getAuthToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || 'Request failed' }
    }

    return { data: data.data || data }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Authenticated file download (used for CSV reports)
export async function apiBlob(endpoint: string): Promise<{ blob?: Blob; error?: string }> {
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      return { error: body?.message || 'Download failed' }
    }
    return { blob: await response.blob() }
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

export interface ReferralSummary {
  code: string
  link: string
  invited: number
  rewarded: number
  rewardPercent: number
  maxPercent: number
  availablePercent: number
  history: { at: string; rewarded: boolean }[]
}

// API methods
export const api = {
  // Auth
  auth: {
    register: (email: string, password: string, displayName?: string) =>
      apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      }),

    resendVerification: (email: string) =>
      apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    login: (email: string, password: string) =>
      apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getMe: () => apiRequest('/api/auth/me'),

    updateProfile: (data: Record<string, unknown>) =>
      apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),

    deleteAccount: () => apiRequest('/api/auth/account', { method: 'DELETE' }),
  },

  // Meals
  meals: {
    getAll: (limit?: number) =>
      apiRequest(`/api/meals${limit ? `?limit=${limit}` : ''}`),

    getById: (id: string) => apiRequest(`/api/meals/${id}`),

    create: (meal: {
      name: string
      calories: number
      protein: number
      carbs: number
      fat: number
      mealType: string
    }) =>
      apiRequest('/api/meals', {
        method: 'POST',
        body: JSON.stringify(meal),
      }),

    update: (
      id: string,
      meal: Partial<{
        name: string
        calories: number
        protein: number
        carbs: number
        fat: number
        mealType: string
      }>
    ) =>
      apiRequest(`/api/meals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(meal),
      }),

    delete: (id: string) =>
      apiRequest(`/api/meals/${id}`, { method: 'DELETE' }),

    getByDate: (date: string) => apiRequest(`/api/meals/date/${date}`),

    getStats: () => apiRequest('/api/meals/stats'),
  },

  // Workouts
  workouts: {
    getAll: (limit?: number) =>
      apiRequest(`/api/workouts${limit ? `?limit=${limit}` : ''}`),

    getById: (id: string) => apiRequest(`/api/workouts/${id}`),

    create: (workout: {
      name: string
      duration: number
      caloriesBurned: number
      exercises: unknown[]
    }) =>
      apiRequest('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workout),
      }),

    update: (
      id: string,
      workout: Partial<{
        name: string
        duration: number
        caloriesBurned: number
        exercises: unknown[]
      }>
    ) =>
      apiRequest(`/api/workouts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(workout),
      }),

    delete: (id: string) =>
      apiRequest(`/api/workouts/${id}`, { method: 'DELETE' }),

    getStats: () => apiRequest('/api/workouts/stats'),
  },

  // AI
  ai: {
    analyzeFood: (imageBase64: string, mealType?: string) =>
      apiRequest('/api/ai/analyze-food', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, mealType }),
      }),

    quickLog: (description: string, mealType?: string) =>
      apiRequest('/api/ai/quick-log', {
        method: 'POST',
        body: JSON.stringify({ description, mealType }),
      }),

    searchNutrition: (query: string) =>
      apiRequest(`/api/ai/nutrition?query=${encodeURIComponent(query)}`),

    getNutrition: (foodName: string) =>
      apiRequest(`/api/ai/nutrition/${encodeURIComponent(foodName)}`),
  },

  // Leaderboard
  leaderboard: {
    get: (limit?: number) =>
      apiRequest(`/api/leaderboard${limit ? `?limit=${limit}` : ''}`),
  },

  // Reports (the signed-in user's own data, as CSV)
  reports: {
    download: (period: 'monthly' | 'yearly' | 'historical') => apiBlob(`/api/reports/export?period=${period}`),
  },

  // Referral rewards
  referrals: {
    me: () => apiRequest<ReferralSummary>('/api/referrals/me'),
    claim: (code: string) =>
      apiRequest<{ discountPercent: number }>('/api/referrals/claim', { method: 'POST', body: JSON.stringify({ code }) }),
  },

  // Contact
  contact: {
    submit: (name: string, email: string, message: string) =>
      apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, message }),
      }),
  },

  // Health check
  health: () => apiRequest('/api/health'),
}

export default api
