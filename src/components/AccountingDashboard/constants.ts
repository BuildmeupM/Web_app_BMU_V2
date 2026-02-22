/**
 * AccountingDashboard — Constants, Types & Helpers
 */

import type { MonthlyTaxData } from "../../services/monthlyTaxDataService";

// ═══════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════

export const THAI_MONTHS = [
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

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received_receipt: { label: "รับใบเสร็จ", color: "#4facfe" },
  paid: { label: "ชำระแล้ว", color: "#ffc107" },
  sent_to_customer: { label: "ส่งลูกค้าแล้ว", color: "#81d4fa" },
  draft_completed: { label: "ร่างแบบเสร็จแล้ว", color: "#ffb74d" },
  passed: { label: "ผ่าน", color: "#4caf50" },
  pending_review: { label: "รอตรวจ", color: "#ff6b35" },
  pending_recheck: { label: "รอตรวจอีกครั้ง", color: "#f44336" },
  draft_ready: { label: "ร่างแบบได้", color: "#f8bbd9" },
  needs_correction: { label: "แก้ไข", color: "#f44336" },
  edit: { label: "แก้ไข", color: "#f44336" },
  inquire_customer: { label: "สอบถามลูกค้าเพิ่มเติม", color: "#9c27b0" },
  additional_review: { label: "ตรวจสอบเพิ่มเติม", color: "#81d4fa" },
  not_submitted: { label: "ไม่มียื่น", color: "#000000" },
  not_started: { label: "ยังไม่ดำเนินการ", color: "#808080" },
};

export const WHT_COMPLETED_STATUSES = [
  "sent_to_customer",
  "paid",
  "received_receipt",
  "not_submitted",
];
export const VAT_COMPLETED_STATUSES = [
  "sent_to_customer",
  "paid",
  "received_receipt",
  "not_submitted",
];
export const CORRECTION_STATUSES = [
  "needs_correction",
  "edit",
  "pending_recheck",
];

// ลำดับสถานะตามความเสร็จของงาน (เสร็จมาก → เสร็จน้อย)
export const STATUS_ORDER: string[] = [
  "received_receipt", // รับใบเสร็จ
  "paid", // ชำระแล้ว
  "sent_to_customer", // ส่งลูกค้าแล้ว
  "passed", // ผ่าน
  "pending_review", // รอตรวจ
  "needs_correction", // แก้ไข
  "edit", // แก้ไข
  "pending_recheck", // รอตรวจอีกครั้ง
  "draft_completed", // ร่างแบบเสร็จแล้ว
  "draft_ready", // ร่างแบบได้
  "inquire_customer", // สอบถามลูกค้าเพิ่มเติม
  "additional_review", // ตรวจสอบเพิ่มเติม
  "not_submitted", // ไม่มียื่น
  "not_started", // ยังไม่ดำเนินการ
];

// ═══════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════

export type TabKey = "service" | "audit" | "sendTax" | "dataEntry";

export interface StatusCount {
  status: string;
  label: string;
  count: number;
  color: string;
}

export const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "audit", label: "Audit" },
  { key: "sendTax", label: "Send Tax" },
  { key: "dataEntry", label: "Data Entry" },
];

// ═══════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════

export function countStatuses(
  data: MonthlyTaxData[],
  field: keyof MonthlyTaxData,
): StatusCount[] {
  const counts: Record<string, number> = {};
  data.forEach((item) => {
    const val = (item[field] as string | null) || "not_started";
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      label: STATUS_CONFIG[status]?.label || status,
      count,
      color: STATUS_CONFIG[status]?.color || "#808080",
    }))
    .sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.status);
      const ib = STATUS_ORDER.indexOf(b.status);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
}

/** Format employee name as ชื่อ(ชื่อเล่น) */
export function fmtName(
  firstName?: string | null,
  nickName?: string | null,
): string {
  const f = firstName || "";
  const n = nickName || "";
  if (f && n) return `${f}(${n})`;
  return f || n || "ไม่ระบุ";
}
