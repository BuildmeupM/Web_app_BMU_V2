/**
 * WorkAssignment — Statistics Helper Functions
 *
 * Generic statistics calculation functions extracted from WorkAssignment.tsx
 * These replace 4 duplicate functions (~400 lines) with 2 generic functions (~120 lines)
 */

import type { SelectOption } from "./types";

/**
 * Employee statistics by role
 */
export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  role: string;
  vatRegistered: number;
  notVatRegistered: number;
  nullVatStatus: number;
  total: number;
}

/**
 * Role-level statistics with grouped employees
 */
export interface RoleStats {
  role: string;
  roleLabel: string;
  employees: Array<{
    employeeId: string;
    employeeName: string;
    vatRegistered: number;
    notVatRegistered: number;
    total: number;
  }>;
  totalEmployees: number;
  totalVatRegistered: number;
  totalNotVatRegistered: number;
  grandTotal: number;
}

/**
 * Common role configurations
 */
const ROLE_CONFIGS = [
  { key: "accounting", label: "ทำบัญชี" },
  { key: "tax_inspection", label: "ตรวจภาษี" },
  { key: "wht", label: "ยื่น WHT" },
  { key: "vat", label: "ยื่น VAT" },
  { key: "document_entry", label: "คีย์เอกสาร" },
] as const;

/**
 * Role-to-options key mapping for employee name resolution
 */
const ROLE_OPTIONS_KEY_MAP: Record<string, string> = {
  accounting: "accounting",
  tax_inspection: "tax_inspection",
  wht: "wht",
  vat: "vat",
  document_entry: "document_entry",
};

/**
 * Resolve employee name from options map by role
 */
const resolveNameByRole = (
  employeeId: string | null,
  role: string,
  optionsMap: Record<string, SelectOption[]>,
): string => {
  if (!employeeId) return "";
  const key = ROLE_OPTIONS_KEY_MAP[role] || role;
  const options = optionsMap[key] || [];
  return options.find((opt) => opt.value === employeeId)?.label || employeeId;
};

/**
 * Generic: Calculate employee-level statistics from assignment data
 *
 * Replaces both calculateWorkStatistics() and calculatePreviewWorkStatistics()
 *
 * @param data - Array of assignment items (from API or preview)
 * @param roleFieldMap - Maps role key to field name in data item
 * @param optionsMap - Role-based user options for name resolution
 * @param vatStatusField - Field name for tax registration status (default: 'tax_registration_status')
 */
export function calculateEmployeeStatistics<T extends object>(
  data: T[],
  roleFieldMap: Record<string, string>,
  optionsMap: Record<string, SelectOption[]>,
  vatStatusField = "tax_registration_status",
): EmployeeStats[] {
  const statsMap = new Map<string, EmployeeStats>();

  data.forEach((item) => {
    const roles = Object.entries(roleFieldMap);

    roles.forEach(([roleKey, fieldName]) => {
      const employeeId = item[fieldName] as string | null;
      if (employeeId) {
        const key = `${employeeId}_${roleKey}`;
        const employeeName = resolveNameByRole(employeeId, roleKey, optionsMap);

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            employeeId,
            employeeName,
            role: roleKey,
            vatRegistered: 0,
            notVatRegistered: 0,
            nullVatStatus: 0,
            total: 0,
          });
        }

        const stats = statsMap.get(key)!;
        const vatStatus = item[vatStatusField] as string | null;

        if (vatStatus === "จดภาษีมูลค่าเพิ่ม") {
          stats.vatRegistered++;
        } else if (vatStatus === "ยังไม่จดภาษีมูลค่าเพิ่ม") {
          stats.notVatRegistered++;
        } else {
          stats.nullVatStatus++;
        }
        stats.total++;
      }
    });
  });

  return Array.from(statsMap.values()).sort((a, b) => {
    if (a.employeeName !== b.employeeName) {
      return a.employeeName.localeCompare(b.employeeName, "th");
    }
    return a.role.localeCompare(b.role, "th");
  });
}

/**
 * Generic: Group employee statistics by role
 *
 * Replaces both calculateWorkStatisticsByRole() and calculatePreviewWorkStatisticsByRole()
 */
export function groupStatisticsByRole(stats: EmployeeStats[]): RoleStats[] {
  const roleMap = new Map<string, RoleStats>();

  ROLE_CONFIGS.forEach((config) => {
    roleMap.set(config.key, {
      role: config.key,
      roleLabel: config.label,
      employees: [],
      totalEmployees: 0,
      totalVatRegistered: 0,
      totalNotVatRegistered: 0,
      grandTotal: 0,
    });
  });

  stats.forEach((stat) => {
    const roleStat = roleMap.get(stat.role);
    if (roleStat) {
      const existingEmployee = roleStat.employees.find(
        (emp) => emp.employeeId === stat.employeeId,
      );

      if (existingEmployee) {
        existingEmployee.vatRegistered += stat.vatRegistered;
        existingEmployee.notVatRegistered += stat.notVatRegistered;
        existingEmployee.total += stat.total;
      } else {
        roleStat.employees.push({
          employeeId: stat.employeeId,
          employeeName: stat.employeeName,
          vatRegistered: stat.vatRegistered,
          notVatRegistered: stat.notVatRegistered,
          total: stat.total,
        });
      }

      roleStat.totalVatRegistered += stat.vatRegistered;
      roleStat.totalNotVatRegistered += stat.notVatRegistered;
      roleStat.grandTotal += stat.total;
    }
  });

  roleMap.forEach((roleStat) => {
    roleStat.totalEmployees = roleStat.employees.length;
    roleStat.employees.sort((a, b) => b.total - a.total);
  });

  return Array.from(roleMap.values()).filter(
    (roleStat) => roleStat.totalEmployees > 0,
  );
}

/**
 * Role field mapping for saved assignments (from API)
 */
export const SAVED_ASSIGNMENT_ROLE_FIELDS: Record<string, string> = {
  accounting: "accounting_responsible",
  tax_inspection: "tax_inspection_responsible",
  wht: "wht_filer_responsible",
  vat: "vat_filer_responsible",
  document_entry: "document_entry_responsible",
};

/**
 * Role field mapping for preview data (new assignments)
 */
export const PREVIEW_ROLE_FIELDS: Record<string, string> = {
  accounting: "new_accounting_responsible",
  tax_inspection: "new_tax_inspection_responsible",
  wht: "new_wht_filer_responsible",
  vat: "new_vat_filer_responsible",
  document_entry: "new_document_entry_responsible",
};
