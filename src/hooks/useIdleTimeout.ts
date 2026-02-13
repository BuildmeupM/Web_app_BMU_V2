import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/authService'
import { notifications } from '@mantine/notifications'

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000 // 2 ชั่วโมง
const WARNING_BEFORE = 60 * 1000 // แจ้งเตือนก่อน 60 วินาที

/**
 * Hook ตรวจจับว่า user ไม่ได้ใช้งาน (idle) เกิน 2 ชั่วโมง
 * ถ้าไม่มี interaction ใดๆ → แจ้งเตือน 60 วินาทีก่อน → auto-logout
 */
export function useIdleTimeout() {
    const { isAuthenticated, logout } = useAuthStore()
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const warningShownRef = useRef(false)

    const doLogout = useCallback(async () => {
        try {
            await authService.logout()
        } catch {
            // ignore
        }
        logout()
        window.location.href = '/login'
    }, [logout])

    const resetTimers = useCallback(() => {
        // ถ้ามี warning อยู่ — ปิด
        if (warningShownRef.current) {
            warningShownRef.current = false
            notifications.hide('idle-warning')
        }

        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current)
            warningTimerRef.current = null
        }
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current)
            idleTimerRef.current = null
        }

        // ตั้ง warning timer (แจ้งเตือนก่อน 60 วินาที)
        warningTimerRef.current = setTimeout(() => {
            warningShownRef.current = true
            notifications.show({
                id: 'idle-warning',
                title: '⏰ ใกล้หมดเวลาใช้งาน',
                message: 'ไม่มีการใช้งานมาสักพัก ระบบจะออกจากระบบอัตโนมัติใน 60 วินาที — กรุณาขยับเมาส์หรือกดปุ่มใดก็ได้',
                color: 'orange',
                autoClose: false,
            })
        }, IDLE_TIMEOUT - WARNING_BEFORE)

        // ตั้ง idle timer — logout เมื่อครบ 2 ชม.
        idleTimerRef.current = setTimeout(() => {
            notifications.show({
                id: 'idle-logout',
                title: '🔒 ออกจากระบบอัตโนมัติ',
                message: 'ไม่มีการใช้งานเกิน 2 ชั่วโมง ระบบได้ทำการออกจากระบบแล้ว',
                color: 'red',
                autoClose: 5000,
            })
            doLogout()
        }, IDLE_TIMEOUT)
    }, [doLogout])

    useEffect(() => {
        if (!isAuthenticated) {
            // ถ้า logout แล้ว — clear ทุก timer
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
            return
        }

        // Events ที่บ่งบอกว่า user ยังใช้งานอยู่
        const events: (keyof WindowEventMap)[] = [
            'mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'mousedown',
        ]

        // Throttle — ไม่ต้อง reset ทุกครั้ง (max 1 ครั้ง/30 วินาที)
        let lastReset = Date.now()
        const throttledReset = () => {
            const now = Date.now()
            if (now - lastReset > 30_000) {
                lastReset = now
                resetTimers()
            }
        }

        events.forEach((e) => window.addEventListener(e, throttledReset, { passive: true }))
        resetTimers() // start timer ครั้งแรก

        return () => {
            events.forEach((e) => window.removeEventListener(e, throttledReset))
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        }
    }, [isAuthenticated, resetTimers])
}
