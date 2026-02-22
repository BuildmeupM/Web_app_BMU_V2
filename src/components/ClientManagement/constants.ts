/**
 * ClientManagement — helper functions and constants
 */
import {
  TbBuilding,
  TbCalendar,
  TbCheck,
  TbX,
  TbCash,
  TbFileInvoice,
  TbFileOff,
} from "react-icons/tb";

// ── Company status options ──
export const companyStatusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "รายเดือน", label: "รายเดือน" },
  { value: "รายเดือน / วางมือ", label: "รายเดือน / วางมือ" },
  { value: "รายเดือน / จ่ายรายปี", label: "รายเดือน / จ่ายรายปี" },
  { value: "รายเดือน / เดือนสุดท้าย", label: "รายเดือน / เดือนสุดท้าย" },
  { value: "ยกเลิกทำ", label: "ยกเลิกทำ" },
];

export const taxRegistrationStatusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "จดภาษีมูลค่าเพิ่ม", label: "จดภาษีมูลค่าเพิ่ม" },
  { value: "ยังไม่จดภาษีมูลค่าเพิ่ม", label: "ยังไม่จดภาษีมูลค่าเพิ่ม" },
];

// ── Helper: company status color (Mantine color name) ──
export const getCompanyStatusColor = (status: string): string => {
  switch (status) {
    case "รายเดือน":
      return "green";
    case "รายเดือน / วางมือ":
      return "yellow";
    case "รายเดือน / จ่ายรายปี":
      return "blue";
    case "รายเดือน / เดือนสุดท้าย":
      return "orange";
    case "ยกเลิกทำ":
      return "red";
    default:
      return "gray";
  }
};

// ── Helper: company status icon ──
export const getCompanyStatusIcon = (status: string) => {
  switch (status) {
    case "รายเดือน":
      return TbCalendar;
    case "รายเดือน / วางมือ":
      return TbCheck;
    case "รายเดือน / จ่ายรายปี":
      return TbCash;
    case "รายเดือน / เดือนสุดท้าย":
      return TbFileInvoice;
    case "ยกเลิกทำ":
      return TbX;
    default:
      return TbBuilding;
  }
};

// ── Helper: company status hex color ──
export const getCompanyStatusColorValue = (status: string): string => {
  switch (status) {
    case "รายเดือน":
      return "#4caf50";
    case "รายเดือน / วางมือ":
      return "#ff9800";
    case "รายเดือน / จ่ายรายปี":
      return "#4facfe";
    case "รายเดือน / เดือนสุดท้าย":
      return "#ff6b35";
    case "ยกเลิกทำ":
      return "#f44336";
    default:
      return "#999";
  }
};

// ── Helper: tax registration status icon ──
export const getTaxStatusIcon = (status: string) => {
  return status === "จดภาษีมูลค่าเพิ่ม" ? TbFileInvoice : TbFileOff;
};
