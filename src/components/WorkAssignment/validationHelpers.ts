/**
 * WorkAssignment — Validation Helper Functions
 *
 * Pure validation functions extracted from WorkAssignment page.
 * All functions are parameterized (no closure dependencies).
 */

import type { PreviewDataItem, SelectOption } from "./types";

// ─── Types ────────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PreviewValidationResult {
  isValid: boolean;
  incompleteItems: Array<{ build: string; missingFields: string[] }>;
}

export interface DataIntegrityResult {
  isValid: boolean;
  warnings: string[];
}

// ─── Validation Functions ─────────────────────────────────────────────

/**
 * Validate preview data — ตรวจสอบข้อมูลที่ยังไม่ได้กรอก
 * ตรวจสอบทุก field: accounting, tax_inspection, wht, vat (เฉพาะจด VAT), document_entry
 */
export function validatePreviewData(
  previewData: PreviewDataItem[],
): PreviewValidationResult {
  const incompleteItems: Array<{ build: string; missingFields: string[] }> = [];

  previewData.forEach((item) => {
    const missingFields: string[] = [];

    if (!item.new_accounting_responsible) {
      missingFields.push("ผู้รับผิดชอบทำบัญชี");
    }
    if (!item.new_tax_inspection_responsible) {
      missingFields.push("ผู้ตรวจภาษี");
    }
    if (!item.new_wht_filer_responsible) {
      missingFields.push("ผู้ยื่น WHT");
    }
    if (
      !item.new_vat_filer_responsible &&
      item.tax_registration_status === "จดภาษีมูลค่าเพิ่ม"
    ) {
      missingFields.push("ผู้ยื่น VAT");
    }
    if (!item.new_document_entry_responsible) {
      missingFields.push("ผู้คีย์เอกสาร");
    }

    if (missingFields.length > 0) {
      incompleteItems.push({
        build: item.build,
        missingFields,
      });
    }
  });

  return {
    isValid: incompleteItems.length === 0,
    incompleteItems,
  };
}

/**
 * Validate build code exists in client list
 */
export function validateBuildCode(
  build: string,
  allClients: Array<{ build: string }>,
): ValidationResult {
  if (!build || build.trim() === "") {
    return { isValid: false, error: "Build code is required" };
  }
  const clientExists = allClients.some((c) => c.build === build);
  if (!clientExists) {
    return { isValid: false, error: "Build code not found in system" };
  }
  return { isValid: true };
}

/**
 * Check data integrity before save
 * - ตรวจสอบ build ซ้ำใน previewData
 * - ตรวจสอบ build ยังมีอยู่ใน client list
 */
export function checkDataIntegrity(
  previewData: PreviewDataItem[],
  allClients: Array<{ build: string }>,
): DataIntegrityResult {
  const warnings: string[] = [];

  // Check for duplicates in preview data itself
  const buildSet = new Set<string>();
  previewData.forEach((item) => {
    if (buildSet.has(item.build)) {
      warnings.push(`Build ${item.build} ปรากฏหลายครั้งใน preview`);
    }
    buildSet.add(item.build);
  });

  // Check if builds still exist in client list
  previewData.forEach((item) => {
    const clientExists = allClients.some((c) => c.build === item.build);
    if (!clientExists) {
      warnings.push(`Build ${item.build} ไม่มีอยู่ในระบบแล้ว`);
    }
  });

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Validate items before bulk save
 * Returns valid and invalid items after checking build codes and employee IDs
 */
export function validateItemsForSave(
  items: PreviewDataItem[],
  allClients: Array<{ build: string }>,
  roleOptionsMap: Record<string, SelectOption[]>,
): {
  validItems: PreviewDataItem[];
  invalidItems: Array<{ build: string; error: string }>;
} {
  const validItems: PreviewDataItem[] = [];
  const invalidItems: Array<{ build: string; error: string }> = [];

  items.forEach((item) => {
    // Validate build code
    const buildValidation = validateBuildCode(item.build, allClients);
    if (!buildValidation.isValid) {
      invalidItems.push({
        build: item.build,
        error: buildValidation.error || "Build code ไม่ถูกต้อง",
      });
      return;
    }

    // Validate employee IDs
    const employeeFields = [
      {
        key: "accounting",
        value: item.new_accounting_responsible,
        options: roleOptionsMap.accounting || [],
      },
      {
        key: "tax_inspection",
        value: item.new_tax_inspection_responsible,
        options: roleOptionsMap.tax_inspection || [],
      },
      {
        key: "wht",
        value: item.new_wht_filer_responsible,
        options: roleOptionsMap.wht || [],
      },
      {
        key: "vat",
        value: item.new_vat_filer_responsible,
        options: roleOptionsMap.vat || [],
      },
      {
        key: "document_entry",
        value: item.new_document_entry_responsible,
        options: roleOptionsMap.document_entry || [],
      },
    ];

    let hasError = false;
    for (const field of employeeFields) {
      if (field.value) {
        const employeeExists = field.options.some(
          (opt) => opt.value === field.value,
        );
        if (!employeeExists) {
          invalidItems.push({
            build: item.build,
            error: `${field.key}: Employee ID not found in system`,
          });
          hasError = true;
          break;
        }
      }
    }

    if (!hasError) {
      validItems.push(item);
    }
  });

  return { validItems, invalidItems };
}
