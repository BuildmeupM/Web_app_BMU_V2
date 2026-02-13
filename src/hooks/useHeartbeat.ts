import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { loginActivityService } from '../services/loginActivityService'
import { authService } from '../services/authService'
import { notifications } from '@mantine/notifications'

const HEARTBEAT_INTERVAL = 2 * 60 * 1000 // 2 นาที
const MAX_REOPEN_COUNT = 3 // ปิด-เปิดเกิน 3 ครั้ง → ต้อง login ใหม่
const TAB_COUNT_KEY = 'bmu-open-tab-count'

/**
 * Custom hook สำหรับ:
 * 1. ส่ง heartbeat ไปยัง server ทุก 2 นาที
 * 2. ตรวจจับ forced_logout (login ซ้อนจากที่อื่น)
 * 3. นับจำนวนครั้งที่ปิดแท็บ *ทุกอัน* แล้วกลับมาเปิดใหม่ (เกิน 3 ครั้ง → force re-login)
 *    - เปิดแท็บเพิ่มขณะที่มีแท็บเดิมอยู่ → ไม่นับ
 *    - ปิดทุกแท็บแล้วกลับมา → นับ 1 ครั้ง
 */
export function useHeartbeat() {
    const { isAuthenticated, sessionId, logout, reopenCount, incrementReopenCount } = useAuthStore()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const hasCheckedReopenRef = useRef(false)
    const tabRegisteredRef = useRef(false)

    // ── Force logout helper ──
    const forceLogout = useCallback(async (reason: string) => {
        try {
            await authService.logout()
        } catch {
            // ignore
        }
        logout()
        // ล้าง tab count เมื่อ logout
        localStorage.removeItem(TAB_COUNT_KEY)
        notifications.show({
            title: '🔒 ออกจากระบบ',
            message: reason,
            color: 'red',
            autoClose: 5000,
        })
        window.location.href = '/login'
    }, [logout])

    // ── ตรวจจับการปิดแท็บทุกอันแล้วกลับมา (reopen count) ──
    useEffect(() => {
        if (!isAuthenticated || hasCheckedReopenRef.current) return
        hasCheckedReopenRef.current = true

        // อ่านจำนวนแท็บที่เปิดอยู่ตอนนี้
        const currentTabCount = parseInt(localStorage.getItem(TAB_COUNT_KEY) || '0', 10)

        if (currentTabCount === 0) {
            // ไม่มีแท็บอื่นเปิดอยู่ → แปลว่าปิดทุกแท็บแล้วกลับมาเปิดใหม่ → นับเป็น 1 ครั้ง
            incrementReopenCount()
            const newCount = reopenCount + 1
            if (newCount > MAX_REOPEN_COUNT) {
                console.warn(`[Heartbeat] Reopen count (${newCount}) exceeded limit, forcing re-login`)
                forceLogout('เปิด-ปิดแท็บเกินกำหนด กรุณาเข้าสู่ระบบใหม่')
                return
            }
        }
        // ถ้ามีแท็บอื่นเปิดอยู่แล้ว → ไม่นับ (เปิดแท็บเพิ่มปกติ)

        // ลงทะเบียนแท็บนี้
        localStorage.setItem(TAB_COUNT_KEY, String(currentTabCount + 1))
        tabRegisteredRef.current = true

        // เมื่อปิดแท็บ → ลดจำนวน
        const handleBeforeUnload = () => {
            const count = parseInt(localStorage.getItem(TAB_COUNT_KEY) || '1', 10)
            const newCount = Math.max(0, count - 1)
            localStorage.setItem(TAB_COUNT_KEY, String(newCount))
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            // ถ้า component unmount (เช่น logout ภายใน app) → ลดจำนวน
            if (tabRegisteredRef.current) {
                const count = parseInt(localStorage.getItem(TAB_COUNT_KEY) || '1', 10)
                localStorage.setItem(TAB_COUNT_KEY, String(Math.max(0, count - 1)))
                tabRegisteredRef.current = false
            }
        }
    }, [isAuthenticated, reopenCount, incrementReopenCount, forceLogout])

    // ── Heartbeat + concurrent login detection ──
    useEffect(() => {
        if (!isAuthenticated) {
            // ถ้า logout แล้ว clear interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        // ส่ง heartbeat ทันทีเมื่อ mount
        const sendHeartbeat = async () => {
            try {
                const result = await loginActivityService.sendHeartbeat(sessionId)

                // ── ตรวจจับ forced_logout (login ซ้อนจากที่อื่น) ──
                if (result.sessionStatus === 'forced_logout') {
                    console.warn('[Heartbeat] Session was forced_logout — another login detected')
                    forceLogout('บัญชีของคุณถูกเข้าสู่ระบบจากที่อื่น')
                    return
                }
            } catch (error) {
                // ไม่ต้อง handle error — heartbeat ไม่ควร block user
                if (import.meta.env.DEV) {
                    console.warn('[Heartbeat] Failed to send heartbeat:', error)
                }
            }
        }

        sendHeartbeat()

        // ส่ง heartbeat ทุก 2 นาที
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isAuthenticated, sessionId, forceLogout])
}
