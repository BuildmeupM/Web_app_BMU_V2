/**
 * Shared Task Constants — ใช้ร่วมกันทุก Registration component
 *
 * เดิมถูกเขียนซ้ำใน:
 *   - TaskDetailDrawer.tsx
 *   - TaskStatusModal.tsx
 */

/** Step key type */
export type StepKey = "step_1" | "step_2" | "step_3" | "step_4" | "step_5";

/** Steps state map */
export type StepsState = Record<StepKey, boolean>;

/** Step definition */
export interface StepDefinition {
  key: StepKey;
  label: string;
  pct: number;
}

/** 5-step definitions for Registration tasks */
export const STEPS: StepDefinition[] = [
  { key: "step_1", label: "ประสานงานขอเอกสาร", pct: 20 },
  { key: "step_2", label: "เตรียมข้อมูล", pct: 40 },
  { key: "step_3", label: "รอลูกค้าเตรียมเอกสาร", pct: 60 },
  { key: "step_4", label: "รอวิ่งแมส", pct: 80 },
  { key: "step_5", label: "ส่งมอบงาน", pct: 100 },
];

/** Default empty steps state */
export const DEFAULT_STEPS: StepsState = {
  step_1: false,
  step_2: false,
  step_3: false,
  step_4: false,
  step_5: false,
};

/** Status configuration for display */
export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "orange" },
  in_progress: { label: "กำลังดำเนินการ", color: "blue" },
  completed: { label: "เสร็จสิ้น", color: "green" },
};
