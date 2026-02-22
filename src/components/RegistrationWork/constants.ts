import {
  TbBuildingBank,
  TbReceiptTax,
  TbShieldCheck,
  TbUsers,
} from "react-icons/tb";

// Department config
export const DEPT_CONFIG: Record<
  string,
  {
    label: string;
    shortLabel: string;
    color: string;
    gradient: string;
    icon: any;
    path: string;
  }
> = {
  dbd: {
    label: "กรมพัฒนาธุรกิจการค้า",
    shortLabel: "DBD",
    color: "#6a1b9a",
    gradient: "linear-gradient(135deg, #7b1fa2 0%, #ab47bc 50%, #ce93d8 100%)",
    icon: TbBuildingBank,
    path: "/registration-work/dbd",
  },
  rd: {
    label: "กรมสรรพากร",
    shortLabel: "RD",
    color: "#2e7d32",
    gradient: "linear-gradient(135deg, #2e7d32 0%, #43a047 50%, #66bb6a 100%)",
    icon: TbReceiptTax,
    path: "/registration-work/rd",
  },
  sso: {
    label: "ประกันสังคม",
    shortLabel: "SSO",
    color: "#1565c0",
    gradient: "linear-gradient(135deg, #1565c0 0%, #1e88e5 50%, #42a5f5 100%)",
    icon: TbShieldCheck,
    path: "/registration-work/sso",
  },
  hr: {
    label: "ฝ่ายบุคคล HR",
    shortLabel: "HR",
    color: "#c62828",
    gradient: "linear-gradient(135deg, #c62828 0%, #e53935 50%, #ef5350 100%)",
    icon: TbUsers,
    path: "/registration-work/hr",
  },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "#ff9800",
  in_progress: "#2196f3",
  completed: "#4caf50",
};

export const PAYMENT_LABELS: Record<string, { label: string; color: string }> =
  {
    paid_full: { label: "ชำระเต็ม", color: "#4caf50" },
    deposit: { label: "มัดจำ", color: "#ff9800" },
    free: { label: "ไม่คิดค่าใช้จ่าย", color: "#9e9e9e" },
    unpaid: { label: "ยังไม่ชำระ", color: "#f44336" },
  };

export const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};
