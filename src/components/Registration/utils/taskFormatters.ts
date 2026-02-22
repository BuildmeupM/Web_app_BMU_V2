/**
 * Shared Task Formatters — ใช้ร่วมกันทุก Registration component
 *
 * เดิมถูกเขียนซ้ำใน:
 *   - TaskDetailDrawer.tsx
 *   - TaskStatusModal.tsx
 */

import type { StepsState } from "./taskConstants";

/**
 * Format date string to Thai locale date
 * @param dateStr - ISO date string or similar
 * @returns Formatted Thai date (DD/MM/YYYY) or original string on error
 */
export function formatThaiDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date string to Thai locale time
 * @param dateStr - ISO date string or similar
 * @returns Formatted Thai time (HH:mm) or empty string on error
 */
export function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Calculate progress percentage from steps state
 * step_5 done = 100% regardless of step_4
 * @param steps - Current steps state
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(steps: StepsState): number {
  if (steps.step_5) return 100;
  return Object.values(steps).filter(Boolean).length * 20;
}

/**
 * Calculate aging days since received date
 * @param receivedDate - ISO date string of received date
 * @returns Number of days since received
 */
export function calculateAgingDays(receivedDate: string): number {
  return Math.floor((Date.now() - new Date(receivedDate).getTime()) / 86400000);
}

/**
 * Determine task status from steps state
 * @param steps - Current steps state
 * @param currentStatus - Current status string
 * @returns Computed status: 'completed', 'in_progress', or 'pending'
 */
export function computeStatusFromSteps(steps: StepsState): string {
  if (steps.step_5) return "completed";
  if (Object.values(steps).some(Boolean)) return "in_progress";
  return "pending";
}
