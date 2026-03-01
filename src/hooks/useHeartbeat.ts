import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import { loginActivityService } from "../services/loginActivityService";
import { authService } from "../services/authService";
import { notifications } from "@mantine/notifications";

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 นาที

/**
 * Custom hook สำหรับ:
 * 1. ส่ง heartbeat ไปยัง server ทุก 2 นาที
 * 2. ตรวจจับ forced_logout (login ซ้อนจากที่อื่น)
 * หมายเหตุ: นำระบบนับ Tab Reopen ออกไปแล้วเพื่อลด UX Friction
 */
export function useHeartbeat() {
  const { isAuthenticated, sessionId, logout } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Force logout helper ──
  const forceLogout = useCallback(
    async (reason: string) => {
      try {
        await authService.logout();
      } catch {
        // ignore
      }
      logout();
      notifications.show({
        title: "🔒 ออกจากระบบ",
        message: reason,
        color: "red",
        autoClose: 5000,
      });
      window.location.href = "/login";
    },
    [logout],
  );

  // ── Heartbeat + concurrent login detection ──
  useEffect(() => {
    if (!isAuthenticated) {
      // ถ้า logout แล้ว clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // ส่ง heartbeat ทันทีเมื่อ mount
    const sendHeartbeat = async () => {
      try {
        const result = await loginActivityService.sendHeartbeat(sessionId);

        // ── ตรวจจับ forced_logout (login ซ้อนจากที่อื่น) ──
        if (result.sessionStatus === "forced_logout") {
          console.warn(
            "[Heartbeat] Session was forced_logout — another login detected",
          );
          forceLogout("บัญชีของคุณถูกเข้าสู่ระบบจากที่อื่น");
          return;
        }
      } catch (error) {
        // ไม่ต้อง handle error — heartbeat ไม่ควร block user
        if (import.meta.env.DEV) {
          console.warn("[Heartbeat] Failed to send heartbeat:", error);
        }
      }
    };

    sendHeartbeat();

    // ส่ง heartbeat ทุก 2 นาที
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, sessionId, forceLogout]);
}
