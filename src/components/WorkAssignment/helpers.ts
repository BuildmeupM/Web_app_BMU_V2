/**
 * WorkAssignment — Helper Functions
 * Pure utility functions extracted from WorkAssignment page
 */

import type { SelectOption } from "./types";

/**
 * Format employee name to display as "ชื่อ (ชื่อเล่น)"
 * If name already contains nickname in parentheses, return as is
 * Otherwise, try to extract nickname from name or use provided nickname
 */
export const formatEmployeeName = (
  name: string | null | undefined,
  nickName?: string | null,
): string => {
  if (!name) return "-";

  // If name already contains parentheses, assume it's already formatted
  if (name.includes("(") && name.includes(")")) {
    return name;
  }

  // If nickname is provided, format as "name (nickname)"
  if (nickName) {
    return `${name}(${nickName})`;
  }

  // Try to extract nickname from name if it's in format "ชื่อ (ชื่อเล่น)"
  // This handles cases where backend might send formatted name
  const match = name.match(/^(.+?)\s*\((.+?)\)$/);
  if (match) {
    return name; // Already formatted
  }

  // Return name as is if no nickname
  return name;
};

/**
 * คำนวณเดือนภาษี (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
 * ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีจะเป็น ธันวาคม 2025
 */
export const getCurrentTaxMonth = () => {
  const now = new Date();
  const taxMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    year: taxMonth.getFullYear(),
    month: taxMonth.getMonth() + 1,
  };
};

/**
 * คำนวณเดือนภาษีถัดไป (เท่ากับเดือนปฏิทินปัจจุบัน)
 * ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีถัดไปจะเป็น มกราคม 2026
 */
export const getNextTaxMonth = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

/** Get current month info (alias for getCurrentTaxMonth) */
export const getCurrentMonth = () => getCurrentTaxMonth();

/** Get next month info (alias for getNextTaxMonth) */
export const getNextMonth = () => getNextTaxMonth();

/**
 * Get view month based on view mode
 */
export const getViewMonth = (viewMode: "current" | "next") => {
  return viewMode === "current" ? getCurrentMonth() : getNextMonth();
};

/**
 * Helper function to deduplicate options by value
 * ใช้ Map เพื่อเก็บเฉพาะ value แรกที่เจอ (ป้องกัน duplicate)
 */
export const deduplicateOptions = (
  options: Array<{ value: string; label: string }>,
): SelectOption[] => {
  if (!options || options.length === 0) return [];

  const seen = new Map<string, { value: string; label: string }>();
  for (const option of options) {
    if (!option || !option.value) continue;
    if (!seen.has(option.value)) {
      seen.set(option.value, option);
    }
  }
  return Array.from(seen.values());
};

/**
 * Toggle all "previous" columns visibility at once
 */
export const getToggledPreviousColumns = (
  currentVisibility: Record<string, boolean>,
  newValue: boolean,
): Record<string, boolean> => ({
  ...currentVisibility,
  prev_accounting: newValue,
  prev_tax_inspection: newValue,
  prev_wht: newValue,
  prev_vat: newValue,
  prev_document_entry: newValue,
});

/**
 * Validate tax month input
 */
export const validateTaxMonthInput = (
  year: number | null,
  month: number | null,
): { isValid: boolean; error?: string } => {
  if (!year || !month) {
    return { isValid: false, error: "กรุณาเลือกปีและเดือนภาษี" };
  }
  if (month < 1 || month > 12) {
    return { isValid: false, error: "เดือนต้องอยู่ระหว่าง 1-12" };
  }
  const currentDate = new Date();
  const maxFutureYear = currentDate.getFullYear() + 2;
  if (year > maxFutureYear) {
    return { isValid: false, error: `ปีไม่สามารถเกิน ${maxFutureYear}` };
  }
  if (year < 2000) {
    return { isValid: false, error: "ปีไม่สามารถน้อยกว่า 2000" };
  }
  return { isValid: true };
};

/**
 * Validate employee ID exists in user options
 */
export const validateEmployeeId = (
  employeeId: string | null,
  userOptions: Array<{ value: string; label: string }>,
): { isValid: boolean; error?: string } => {
  if (!employeeId) return { isValid: true }; // Optional field
  const employeeExists = userOptions.some((opt) => opt.value === employeeId);
  if (!employeeExists) {
    return { isValid: false, error: "Employee ID not found in system" };
  }
  return { isValid: true };
};

/**
 * Map user data to select options with deduplication
 */
export const mapUsersToOptions = (
  usersData:
    | Array<{
        employee_id?: string;
        id?: string | number;
        name?: string;
        nick_name?: string;
      }>
    | undefined
    | null,
): SelectOption[] => {
  if (!usersData || usersData.length === 0) return [];
  return deduplicateOptions(
    usersData
      .filter((user) => user && (user.employee_id || user.id))
      .map((user) => ({
        value: String(user.employee_id || user.id),
        label: formatEmployeeName(user.name, user.nick_name),
      })),
  );
};

/**
 * Resolve employee name from employee ID using role-based options map
 */
export const resolveEmployeeName = (
  employeeId: string | null,
  role: string,
  optionsMap: Record<string, SelectOption[]>,
): string => {
  if (!employeeId) return "";
  const options = optionsMap[role] || [];
  return options.find((opt) => opt.value === employeeId)?.label || employeeId;
};
