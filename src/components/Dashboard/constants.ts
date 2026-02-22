/**
 * Dashboard — shared constants and helpers
 */
import { TbSpeakerphone, TbNews, TbMessage2 } from "react-icons/tb";

// ─── Category Map ───────────────────────────────────
export const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; icon: typeof TbSpeakerphone }
> = {
  announcement: { label: "ประกาศ", color: "red", icon: TbSpeakerphone },
  news: { label: "ข่าวสาร", color: "blue", icon: TbNews },
  discussion: { label: "สนทนา", color: "grape", icon: TbMessage2 },
};

// ─── Event Type Map ─────────────────────────────────
export const EVENT_TYPE_MAP: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  meeting: { label: "ประชุม", emoji: "🤝", color: "#4263eb" },
  holiday: { label: "เกี่ยวกับภาษี", emoji: "🧾", color: "#e03131" },
  deadline: { label: "กำหนดส่ง", emoji: "⏰", color: "#f59f00" },
  other: { label: "อื่นๆ", emoji: "📌", color: "#868e96" },
};

// ─── Calendar Constants ─────────────────────────────
export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
export const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const THAI_DAYS_FULL = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const AVATAR_COLORS = [
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "yellow",
  "orange",
  "red",
  "pink",
  "grape",
  "violet",
  "indigo",
];

// ─── Helpers ────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr.replace(" ", "T") + "+07:00");
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return dateStr.split(" ")[0];
}

export function getInitials(name: string): string {
  return name?.slice(0, 2) || "??";
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name?.length || 0); i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getCalendarDays(
  year: number,
  month: number,
): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
