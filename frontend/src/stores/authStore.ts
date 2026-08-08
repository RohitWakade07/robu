import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { api, ApiError } from '../api/client'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  /** True until the initial fetchUser() call completes on app mount. */
  isInitializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  /** Called by the API client 401 interceptor to silently refresh the access token. */
  refreshAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: true,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const tokens = await api.auth.login(email, password)
          localStorage.setItem('access_token', tokens.access_token)
          localStorage.setItem('refresh_token', tokens.refresh_token)
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
          })
          const user = await api.auth.me()
          set({ user, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitializing: false,
        })
      },

      fetchUser: async () => {
        const token = get().accessToken || localStorage.getItem('access_token')
        if (!token) {
          // No token at all — not authenticated, done initializing
          set({ isInitializing: false })
          return
        }
        try {
          const user = await api.auth.me()
          set({ user, isAuthenticated: true, accessToken: token, isInitializing: false })
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            // Access token expired — try refreshing before giving up
            const newToken = await get().refreshAccessToken()
            if (newToken) {
              try {
                const user = await api.auth.me()
                set({ user, isAuthenticated: true, accessToken: newToken, isInitializing: false })
                return
              } catch {
                // Refresh succeeded but /me still failed — clear session
              }
            }
          }
          get().logout()
        }
      },

      refreshAccessToken: async () => {
        const refreshToken =
          get().refreshToken || localStorage.getItem('refresh_token')
        if (!refreshToken) {
          get().logout()
          return null
        }
        try {
          const tokens = await api.auth.refresh(refreshToken)
          localStorage.setItem('access_token', tokens.access_token)
          localStorage.setItem('refresh_token', tokens.refresh_token)
          set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          })
          return tokens.access_token
        } catch {
          get().logout()
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          return null
        }
      },
    }),
    {
      name: 'robu-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
