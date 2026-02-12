import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { loginActivityService } from '../services/loginActivityService'

const HEARTBEAT_INTERVAL = 2 * 60 * 1000 // 2 นาที

/**
 * Custom hook สำหรับส่ง heartbeat ไปยัง server ทุก 2 นาที
 * เพื่อบอกว่า user ยังออนไลน์อยู่
 * ทำงานเฉพาะเมื่อ user authenticated เท่านั้น
 */
export function useHeartbeat() {
    const { isAuthenticated, sessionId } = useAuthStore()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
                await loginActivityService.sendHeartbeat(sessionId)
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
    }, [isAuthenticated, sessionId])
}
