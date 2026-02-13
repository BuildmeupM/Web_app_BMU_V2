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
  reopenCount: number // นับจำนวนครั้งที่เปิดแท็บใหม่ (เกิน 3 → ต้อง login ใหม่)
  _hasHydrated: boolean // Flag เพื่อตรวจสอบว่า persist hydration เสร็จแล้วหรือยัง
  login: (user: User, token: string, sessionId?: string) => void
  logout: () => void
  incrementReopenCount: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      sessionId: null,
      isAuthenticated: false,
      reopenCount: 0,
      _hasHydrated: false,
      login: (user, token, sessionId) => {
        set({ user, token, sessionId: sessionId || null, isAuthenticated: true, reopenCount: 0 })
      },
      logout: () => {
        set({ user: null, token: null, sessionId: null, isAuthenticated: false, reopenCount: 0 })
      },
      incrementReopenCount: () => {
        set((state) => ({ reopenCount: state.reopenCount + 1 }))
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'auth-storage',
      // ใช้ localStorage เพื่อจำ login เมื่อปิดแท็บ (ร่วมกับ reopenCount เพื่อบังคับ re-login หลังปิด-เปิดเกิน 3 ครั้ง)
      storage: createJSONStorage(() => localStorage),
      // ✅ BUG-168: สำคัญ: รอ hydration เสร็จก่อนตรวจสอบ auth state
      // เพิ่ม error handling เพื่อป้องกันปัญหาที่ callback ไม่ทำงาน
      onRehydrateStorage: () => (state, error) => {
        // เมื่อ hydration เสร็จแล้ว (หรือ error) ให้ set flag เป็น true
        // เพื่อให้ component render ได้แม้ว่า hydration จะ fail
        if (state) {
          // Hydration สำเร็จ - set flag เป็น true
          if (import.meta.env.DEV) {
            console.log('[AuthStore] Hydration successful, setting _hasHydrated to true')
          }
          state.setHasHydrated(true)
        } else if (error) {
          // ✅ BUG-168: ถ้า hydration error ก็ set เป็น true เพื่อให้ component render ได้
          // (จะไม่มี auth state แต่ component จะ render และ redirect ไป login)
          console.warn('⚠️ [AuthStore] Hydration error:', error)
          // Set hydrated เป็น true เพื่อให้ component render ได้
          useAuthStore.getState().setHasHydrated(true)
        } else {
          // ✅ BUG-168: ถ้า state เป็น null และไม่มี error (กรณีที่ไม่มีข้อมูลใน storage)
          // ก็ set เป็น true เพื่อให้ component render ได้
          if (import.meta.env.DEV) {
            console.log('[AuthStore] No state in storage, setting _hasHydrated to true')
          }
          useAuthStore.getState().setHasHydrated(true)
        }
      },
      // ✅ Skip hydration ใน SSR (ถ้ามี) - แต่ในกรณีนี้เป็น client-side เท่านั้น
      skipHydration: false,
      // ✅ BUG-168: ไม่ persist _hasHydrated เพื่อป้องกันปัญหาที่ state ถูก persist แล้วแต่ callback ไม่ทำงาน
      // ทำให้ _hasHydrated จะถูก reset เป็น false ทุกครั้งที่ mount
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
        reopenCount: state.reopenCount,
        // ไม่ persist _hasHydrated - จะถูก set เป็น true เมื่อ hydration เสร็จ
      }),
    }
  )
)
