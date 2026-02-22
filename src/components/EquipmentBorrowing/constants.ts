/**
 * EquipmentBorrowing — shared constants and helpers
 */
import React from "react";
import {
  TbDeviceLaptop,
  TbDeviceDesktop,
  TbMouse,
  TbKeyboard,
  TbCamera,
  TbHeadphones,
  TbPlug,
  TbLink,
  TbBox,
} from "react-icons/tb";

// ── หมวดหมู่ label + icon ──
export const categoryConfig: Record<
  string,
  { label: string; icon: React.ComponentType<any>; color: string }
> = {
  laptop: { label: "แล็ปท็อป", icon: TbDeviceLaptop, color: "blue" },
  monitor: { label: "จอมอนิเตอร์", icon: TbDeviceDesktop, color: "violet" },
  mouse: { label: "เมาส์", icon: TbMouse, color: "green" },
  keyboard: { label: "คีย์บอร์ด", icon: TbKeyboard, color: "orange" },
  webcam: { label: "กล้องเว็บแคม", icon: TbCamera, color: "pink" },
  headset: { label: "หูฟัง", icon: TbHeadphones, color: "cyan" },
  charger: { label: "ที่ชาร์จ", icon: TbPlug, color: "yellow" },
  cable: { label: "สายเคเบิล", icon: TbLink, color: "gray" },
  other: { label: "อื่นๆ", icon: TbBox, color: "dark" },
};

export const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: "พร้อมใช้งาน", color: "green" },
  borrowed: { label: "กำลังถูกยืม", color: "orange" },
  maintenance: { label: "ซ่อมบำรุง", color: "yellow" },
  retired: { label: "ปลดระวาง", color: "gray" },
};

export const borrowStatusConfig: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "รออนุมัติ", color: "yellow" },
  approved: { label: "อนุมัติแล้ว", color: "blue" },
  borrowed: { label: "กำลังยืม", color: "orange" },
  returned: { label: "คืนแล้ว", color: "green" },
  rejected: { label: "ปฏิเสธ", color: "red" },
  overdue: { label: "เกินกำหนด", color: "red" },
};

// ── Utility: format date ──
export const formatDate = (d: string | null): string => {
  if (!d) return "–";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return d;
  }
};
