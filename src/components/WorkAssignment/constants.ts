/**
 * WorkAssignment — Constants
 * Shared constants used across WorkAssignment components
 */

import type { ColumnVisibility, SelectOption } from "./types";

/** Thai month names for display */
export const THAI_MONTHS: SelectOption[] = [
  { value: "1", label: "มกราคม" },
  { value: "2", label: "กุมภาพันธ์" },
  { value: "3", label: "มีนาคม" },
  { value: "4", label: "เมษายน" },
  { value: "5", label: "พฤษภาคม" },
  { value: "6", label: "มิถุนายน" },
  { value: "7", label: "กรกฎาคม" },
  { value: "8", label: "สิงหาคม" },
  { value: "9", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
];

/** Month options (same as THAI_MONTHS) */
export const MONTH_OPTIONS: SelectOption[] = THAI_MONTHS;

/** Company status options for bulk create */
export const COMPANY_STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "รายเดือน", label: "รายเดือน" },
  { value: "รายเดือน / วางมือ", label: "รายเดือน / วางมือ" },
  { value: "รายเดือน / จ่ายรายปี", label: "รายเดือน / จ่ายรายปี" },
  { value: "รายเดือน / เดือนสุดท้าย", label: "รายเดือน / เดือนสุดท้าย" },
  { value: "ยกเลิกทำ", label: "ยกเลิกทำ" },
];

/** All status values (excluding 'all') */
export const ALL_COMPANY_STATUSES = COMPANY_STATUS_OPTIONS.filter(
  (opt) => opt.value !== "all",
).map((opt) => opt.value);

/** Default column visibility */
export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  build: true,
  company_name: true,
  legal_entity_number: false,
  tax_registration_status: true,
  company_status: true,
  target_tax_month: true,
  assignment_status: true,
  prev_accounting: false,
  new_accounting: true,
  prev_tax_inspection: false,
  new_tax_inspection: true,
  prev_wht: false,
  new_wht: true,
  prev_vat: false,
  new_vat: true,
  prev_document_entry: false,
  new_document_entry: true,
};

/** Role definitions for assignment */
export const ROLE_DEFINITIONS = [
  { key: "accounting", label: "ทำบัญชี", field: "new_accounting_responsible" },
  {
    key: "tax_inspection",
    label: "ตรวจภาษี",
    field: "new_tax_inspection_responsible",
  },
  { key: "wht", label: "ยื่น WHT", field: "new_wht_filer_responsible" },
  { key: "vat", label: "ยื่น VAT", field: "new_vat_filer_responsible" },
  {
    key: "document_entry",
    label: "คีย์เอกสาร",
    field: "new_document_entry_responsible",
  },
] as const;
