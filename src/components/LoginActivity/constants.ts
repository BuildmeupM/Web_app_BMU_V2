/**
 * LoginActivity — Constants & Helper Functions
 */

/* ─────────────── Failure Reason Labels ─────────────── */
export const failureReasonLabels: Record<string, string> = {
  invalid_password: "รหัสผ่านไม่ถูกต้อง",
  user_not_found: "ไม่พบผู้ใช้",
  account_locked: "บัญชีถูกล็อค",
  account_inactive: "บัญชีไม่ได้ใช้งาน",
  invalid_username_format: "รูปแบบชื่อผู้ใช้ไม่ถูกต้อง",
  invalid_password_format: "รูปแบบรหัสผ่านไม่ถูกต้อง",
};

/* ─────────────── IP Address Monitoring ─────────────── */
export const KNOWN_INTERNAL_IPS = [
  "171.7.95.152",
  "110.169.43.81",
  "127.0.0.1",
  "::1",
  "localhost",
  "::ffff:127.0.0.1",
];

export function isInternalIP(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return KNOWN_INTERNAL_IPS.includes(ip);
}

/* ─────────────── Session Status Label ─────────────── */
export const sessionStatusMap: Record<
  string,
  { label: string; color: string }
> = {
  active: { label: "กำลังใช้งาน", color: "green" },
  logged_out: { label: "ออกจากระบบ", color: "blue" },
  expired: { label: "หมดเวลา", color: "orange" },
};

/* ─────────────── Format Helpers ─────────────── */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 นาที";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${m} นาที`;
}

export function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
