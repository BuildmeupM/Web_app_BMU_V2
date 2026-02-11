import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import type { UserRole } from '../../store/authStore'
import LoadingSpinner from '../Loading/LoadingSpinner'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, token, user, _hasHydrated, setHasHydrated } = useAuthStore()

  // ✅ BUG-168: Fallback hydration ใน ProtectedRoute เพื่อป้องกันปัญหาที่ App.tsx fallback ไม่ทำงาน
  useEffect(() => {
    if (!_hasHydrated) {
      const timer = setTimeout(() => {
        // ถ้ายังไม่ hydrated หลังจาก 150ms ให้ set เป็น true (fallback)
        // ใช้เวลา 150ms เพื่อให้ App.tsx fallback (100ms) มีโอกาสทำงานก่อน
        if (import.meta.env.DEV) {
          console.log('[ProtectedRoute] Fallback hydration: Setting _hasHydrated to true')
        }
        setHasHydrated(true)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [_hasHydrated, setHasHydrated])

  // ✅ Debug: Log hydration state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ProtectedRoute] Hydration state:', { _hasHydrated, isAuthenticated, hasToken: !!token })
    }
  }, [_hasHydrated, isAuthenticated, token])

  // ✅ สำคัญ: รอ hydration เสร็จก่อนตรวจสอบ auth state
  // ป้องกัน race condition เมื่อ refresh หน้า (F5)
  // ถ้ายังไม่ hydrate เสร็จ ให้แสดง loading
  if (!_hasHydrated) {
    return <LoadingSpinner />
  }

  // ตรวจสอบทั้ง isAuthenticated และ token
  // ถ้าไม่มี token หรือ isAuthenticated เป็น false ให้ redirect ไป login
  // Token validation จะทำโดย API interceptor (ถ้า token ไม่ valid จะได้ 401 และ logout อัตโนมัติ)
  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // ✅ Role-based access control: ถ้ากำหนด allowedRoles ให้ตรวจสอบ role ของ user
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
