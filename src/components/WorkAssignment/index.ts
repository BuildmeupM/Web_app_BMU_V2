/**
 * WorkAssignment — Barrel Export
 * Re-exports all shared modules for convenient importing
 */

export * from "./types";
export * from "./constants";
export * from "./helpers";
export * from "./statisticsHelpers";
export * from "./validationHelpers";

// Hook exports
export { useWorkAssignmentQueries } from "./useWorkAssignmentQueries";
export { useWorkAssignmentMutations } from "./useWorkAssignmentMutations";

// Component exports
export { default as AssignmentTable } from "./AssignmentTable";
export { default as CreateEditFormModal } from "./CreateEditFormModal";
export { default as BulkCreateModal } from "./BulkCreateModal";
export { default as SaveConfirmationModals } from "./SaveConfirmationModals";
export { default as DeleteConfirmModal } from "./DeleteConfirmModal";
export { default as ResponsibilityChangeModal } from "./ResponsibilityChangeModal";
export { default as BulkResponsibilityChangeModal } from "./BulkResponsibilityChangeModal";
export { default as WorkAssignmentImport } from "./WorkAssignmentImport";
export { default as PreviewDataTable } from "./PreviewDataTable";
export { default as FilterSection } from "./FilterSection";
export { default as PageHeader } from "./PageHeader";
export { default as StatisticsSection } from "./StatisticsSection";
