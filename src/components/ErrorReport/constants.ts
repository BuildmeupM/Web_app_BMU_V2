/**
 * ErrorReport — Constants & Helper Functions
 */

import {
  ERROR_TYPE_OPTIONS,
  MONTH_OPTIONS,
  type ErrorReportForm,
} from "../../services/errorReportService";

// Year options for tax month filter
const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i + 543), // Buddhist year
}));

export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: "yellow", label: "รอตรวจสอบ" },
  approved: { color: "green", label: "อนุมัติแล้ว" },
  rejected: { color: "red", label: "ไม่อนุมัติ" },
};

export const MESSENGER_STATUS_CONFIG: Record<
  string,
  { color: string; label: string }
> = {
  pending: { color: "yellow", label: "รอวิ่ง" },
  in_progress: { color: "blue", label: "กำลังดำเนินการ" },
  completed: { color: "green", label: "เสร็จแล้ว" },
  failed: { color: "red", label: "ล้มเหลว" },
};

export const emptyForm: ErrorReportForm = {
  report_date: new Date().toISOString().slice(0, 10),
  client_id: null,
  client_name: "",
  error_types: [],
  tax_months: [],
  auditor_id: null,
  auditor_name: "",
  fault_party: "",
  fine_amount: "",
  submission_address: "",
};

export const getErrorTypeLabels = (types: string[]) => {
  if (!types || !Array.isArray(types)) return "-";
  return types
    .map((t) => {
      const opt = ERROR_TYPE_OPTIONS.find((o) => o.value === t);
      return opt ? opt.label : t;
    })
    .join(", ");
};

export const getTaxMonthLabels = (months: string[]) => {
  if (!months || !Array.isArray(months)) return "-";
  return months
    .map((m) => {
      const [year, month] = m.split("-");
      const monthOpt = MONTH_OPTIONS.find((o) => o.value === month);
      const thaiYear = Number(year) + 543;
      return monthOpt ? `${monthOpt.label} ${thaiYear}` : m;
    })
    .join(", ");
};
