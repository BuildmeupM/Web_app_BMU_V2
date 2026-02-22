/**
 * WorkAssignment — Shared Types
 * Types used across WorkAssignment components
 */

/** Preview data item for bulk create */
export interface PreviewDataItem {
  build: string;
  company_name: string;
  legal_entity_number: string;
  tax_registration_status: string | null;
  company_status: string;
  // Target tax month (เดือนภาษีที่จะบันทึก)
  target_tax_year: number | null;
  target_tax_month: number | null;
  // Status: งานจัดแล้วหรือยังไม่จัด
  is_assigned: boolean;
  existing_assignment_id: string | null;
  // Previous month data
  prev_accounting_responsible: string | null;
  prev_accounting_responsible_name: string | null;
  prev_tax_inspection_responsible: string | null;
  prev_tax_inspection_responsible_name: string | null;
  prev_wht_filer_responsible: string | null;
  prev_wht_filer_responsible_name: string | null;
  prev_vat_filer_responsible: string | null;
  prev_vat_filer_responsible_name: string | null;
  prev_document_entry_responsible: string | null;
  prev_document_entry_responsible_name: string | null;
  // New month data (editable)
  new_accounting_responsible: string | null;
  new_tax_inspection_responsible: string | null;
  new_wht_filer_responsible: string | null;
  new_vat_filer_responsible: string | null;
  new_document_entry_responsible: string | null;
}

// EmployeeStats and RoleStats moved to statisticsHelpers.ts

/** Employee work assignment detail */
export interface EmployeeWork {
  role: string;
  roleLabel: string;
  build: string;
  companyName: string;
  taxRegistrationStatus: string | null;
  companyStatus: string;
}

/** Column visibility settings */
export interface ColumnVisibility {
  build: boolean;
  company_name: boolean;
  legal_entity_number: boolean;
  tax_registration_status: boolean;
  company_status: boolean;
  target_tax_month: boolean;
  assignment_status: boolean;
  prev_accounting: boolean;
  new_accounting: boolean;
  prev_tax_inspection: boolean;
  new_tax_inspection: boolean;
  prev_wht: boolean;
  new_wht: boolean;
  prev_vat: boolean;
  new_vat: boolean;
  prev_document_entry: boolean;
  new_document_entry: boolean;
}

/** Select option */
export interface SelectOption {
  value: string;
  label: string;
}
