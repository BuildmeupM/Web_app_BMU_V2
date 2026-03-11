import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type UserRole = 'admin' | 'data_entry' | 'data_entry_and_service' | 'audit' | 'service' | 'hr' | 'registration' | 'marketing'

export interface User {
  id: string
  username: string
  email: string
  employee_id?: string | null
  nick_name?: string | null
  role: UserRole
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  sessionId: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean // Flag เพื่อตรวจสอบว่า persist hydration เสร็จแล้วหรือยัง
  login: (user: User, token: string, sessionId?: string) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      sessionId: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (user, token, sessionId) => {
        set({ user, token, sessionId: sessionId || null, isAuthenticated: true })
      },
      logout: () => {
        set({ user: null, token: null, sessionId: null, isAuthenticated: false })
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'auth-storage',
      // ใช้ localStorage เพื่อให้ session คงอยู่หลังปิด/เปิด Browser
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          state.setHasHydrated(true)
        } else {
          if (error) console.warn('⚠️ [AuthStore] Hydration error:', error)
          useAuthStore.getState().setHasHydrated(true)
        }
      },
      skipHydration: false,
      // ไม่ persist _hasHydrated — จะถูก set เป็น true เมื่อ hydration เสร็จ
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
