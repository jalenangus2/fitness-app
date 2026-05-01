import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: number
  email: string
  username: string
  display_name?: string | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  updateUser: (updates: Partial<AuthUser>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (updates) => set((s) => ({ user: s.user ? { ...s.user, ...updates } : s.user })),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'lifeos-auth',
    }
  )
)
