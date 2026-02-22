import { AccountingFees } from "../../services/clientsService";

// ─── Constants ───────────────────────────────────────────────

export const companyStatusOptions = [
  { value: "รายเดือน", label: "รายเดือน" },
  { value: "รายเดือน / วางมือ", label: "รายเดือน / วางมือ" },
  { value: "รายเดือน / จ่ายรายปี", label: "รายเดือน / จ่ายรายปี" },
  { value: "รายเดือน / เดือนสุดท้าย", label: "รายเดือน / เดือนสุดท้าย" },
  { value: "ยกเลิกทำ", label: "ยกเลิกทำ" },
];

export const defaultStatuses = companyStatusOptions
  .filter((opt) => opt.value.includes("รายเดือน"))
  .map((opt) => opt.value);

export const MONTHS_TH = [
  { key: "jan", label: "ม.ค." },
  { key: "feb", label: "ก.พ." },
  { key: "mar", label: "มี.ค." },
  { key: "apr", label: "เม.ย." },
  { key: "may", label: "พ.ค." },
  { key: "jun", label: "มิ.ย." },
  { key: "jul", label: "ก.ค." },
  { key: "aug", label: "ส.ค." },
  { key: "sep", label: "ก.ย." },
  { key: "oct", label: "ต.ค." },
  { key: "nov", label: "พ.ย." },
  { key: "dec", label: "ธ.ค." },
];

export const monthViewOptions = [
  { label: "3 เดือน", value: "3" },
  { label: "6 เดือน", value: "6" },
  { label: "9 เดือน", value: "9" },
  { label: "12 เดือน", value: "12" },
];

// ─── Helper Functions ────────────────────────────────────────

export const getStatusColor = (status: string): string => {
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

export const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "-";
  return Math.round(val).toLocaleString("th-TH");
};

export const getMonthlyFee = (
  fees: AccountingFees | null | undefined,
  prefix: string,
  monthKey: string,
): number | null => {
  if (!fees) return null;
  return (
    (fees as Record<string, number | null | undefined>)[
      `${prefix}_${monthKey}`
    ] ?? null
  );
};

export const sumFees = (
  fees: AccountingFees | null | undefined,
  prefix: string,
  monthCount: number,
): number => {
  if (!fees) return 0;
  const months = MONTHS_TH.slice(0, monthCount);
  return months.reduce((sum, m) => {
    const val = (fees as Record<string, number | null | undefined>)[
      `${prefix}_${m.key}`
    ];
    return sum + (typeof val === "number" ? val : 0);
  }, 0);
};
