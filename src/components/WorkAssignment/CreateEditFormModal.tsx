/**
 * CreateEditFormModal — Modal สร้าง/แก้ไขการจัดงาน
 * Extracted from WorkAssignment page (lines 2164-2343)
 */
import {
  Modal, Stack, Select, Grid, NumberInput, Group, Button, Text, Textarea,
} from '@mantine/core'
import type { SelectOption } from './types'
import { getCurrentTaxMonth, getNextTaxMonth } from './helpers'

interface CreateEditFormModalProps {
  opened: boolean
  onClose: () => void
  formMode: 'create' | 'edit'
  viewMode: 'current' | 'next'
  setViewMode: (v: 'current' | 'next') => void
  // Form state
  formBuild: string
  setFormBuild: (v: string) => void
  formYear: number
  setFormYear: (v: number) => void
  formMonth: number
  setFormMonth: (v: number) => void
  formAccountingResponsible: string | null
  setFormAccountingResponsible: (v: string | null) => void
  formTaxInspectionResponsible: string | null
  setFormTaxInspectionResponsible: (v: string | null) => void
  formWhtFilerResponsible: string | null
  setFormWhtFilerResponsible: (v: string | null) => void
  formVatFilerResponsible: string | null
  setFormVatFilerResponsible: (v: string | null) => void
  formDocumentEntryResponsible: string | null
  setFormDocumentEntryResponsible: (v: string | null) => void
  formNote: string
  setFormNote: (v: string) => void
  // Company status filter
  companyStatusFilter: string
  setCompanyStatusFilter: (v: string) => void
  companyStatusOptions: SelectOption[]
  // Drop-down data
  clientOptions: SelectOption[]
  clientSearchValue: string
  setClientSearchValue: (v: string) => void
  accountingUserOptions: SelectOption[]
  taxInspectionUserOptions: SelectOption[]
  filingUserOptions: SelectOption[]
  documentEntryUserOptions: SelectOption[]
  monthOptions: SelectOption[]
  // Handlers
  onSubmit: () => void
  resetForm: () => void
  isSubmitting: boolean
}

export default function CreateEditFormModal({
  opened, onClose, formMode, viewMode, setViewMode,
  formBuild, setFormBuild, formYear, setFormYear, formMonth, setFormMonth,
  formAccountingResponsible, setFormAccountingResponsible,
  formTaxInspectionResponsible, setFormTaxInspectionResponsible,
  formWhtFilerResponsible, setFormWhtFilerResponsible,
  formVatFilerResponsible, setFormVatFilerResponsible,
  formDocumentEntryResponsible, setFormDocumentEntryResponsible,
  formNote, setFormNote,
  companyStatusFilter, setCompanyStatusFilter, companyStatusOptions,
  clientOptions, clientSearchValue, setClientSearchValue,
  accountingUserOptions, taxInspectionUserOptions, filingUserOptions, documentEntryUserOptions,
  monthOptions, onSubmit, resetForm, isSubmitting,
}: CreateEditFormModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={() => { onClose(); resetForm() }}
      title={formMode === 'create' ? 'สร้างการจัดงานใหม่' : 'แก้ไขการจัดงาน'}
      size="xl"
      radius="lg"
    >
      <Stack gap="md">
        {/* Company Status Filter */}
        <Select
          label="กรองตามสถานะบริษัท"
          placeholder="เลือกสถานะบริษัท"
          data={companyStatusOptions}
          value={companyStatusFilter}
          onChange={(value) => setCompanyStatusFilter(value || 'all')}
          clearable={false}
        />
        <Select
          label="ลูกค้า (Build)"
          placeholder="พิมพ์ค้นหาลูกค้า..."
          data={clientOptions}
          value={formBuild}
          onChange={(value) => setFormBuild(value || '')}
          onSearchChange={setClientSearchValue}
          searchValue={clientSearchValue}
          required searchable
          nothingFoundMessage="ไม่พบลูกค้า"
          disabled={formMode === 'edit'}
          description={
            companyStatusFilter !== 'all'
              ? `แสดงเฉพาะบริษัทที่มีสถานะ: ${companyStatusOptions.find((opt) => opt.value === companyStatusFilter)?.label}`
              : 'พิมพ์ค้นหาเพื่อแสดงรายชื่อบริษัท'
          }
        />
        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="ปี" value={formYear}
              onChange={(value) => {
                const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) : new Date().getFullYear())
                setFormYear(isNaN(numValue) ? new Date().getFullYear() : numValue)
              }}
              min={2020} max={2100} required disabled={formMode === 'edit'}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="เดือน" placeholder="เลือกเดือน"
              data={monthOptions} value={formMonth.toString()}
              onChange={(value) => setFormMonth(value ? parseInt(value) : 1)}
              required disabled={formMode === 'edit'}
            />
          </Grid.Col>
        </Grid>
        {formMode === 'create' && (
          <Group gap="sm">
            <Button variant={viewMode === 'current' ? 'filled' : 'light'} color="orange" size="sm"
              onClick={() => { const c = getCurrentTaxMonth(); setFormYear(c.year); setFormMonth(c.month); setViewMode('current') }}>
              ใช้เดือนภาษีปัจจุบัน ({getCurrentTaxMonth().year}/{getCurrentTaxMonth().month})
            </Button>
            <Button variant={viewMode === 'next' ? 'filled' : 'light'} color="blue" size="sm"
              onClick={() => { const n = getNextTaxMonth(); setFormYear(n.year); setFormMonth(n.month); setViewMode('next') }}>
              ใช้เดือนภาษีถัดไป ({getNextTaxMonth().year}/{getNextTaxMonth().month})
            </Button>
          </Group>
        )}
        {formMode === 'create' && (
          <Text size="xs" c="dimmed">
            💡 เดือนภาษีจะนับย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน
            <br />
            ตัวอย่าง: ถ้าปัจจุบันเป็นมกราคม 2026 เดือนภาษีจะเป็น ธันวาคม 2025
          </Text>
        )}
        <Select label="ผู้ทำบัญชี" placeholder="เลือกผู้ทำบัญชี" data={accountingUserOptions}
          value={formAccountingResponsible} onChange={setFormAccountingResponsible}
          clearable searchable description="เลือกจาก role: service, data_entry_and_service" />
        <Select label="ผู้ตรวจภาษี" placeholder="เลือกผู้ตรวจภาษี" data={taxInspectionUserOptions}
          value={formTaxInspectionResponsible} onChange={setFormTaxInspectionResponsible}
          clearable searchable description="เลือกจาก role: audit" />
        <Select label="ผู้ยื่น WHT" placeholder="เลือกผู้ยื่น WHT" data={filingUserOptions}
          value={formWhtFilerResponsible} onChange={setFormWhtFilerResponsible}
          clearable searchable description="เลือกจาก role: data_entry_and_service" />
        <Select label="ผู้ยื่น VAT" placeholder="เลือกผู้ยื่น VAT" data={filingUserOptions}
          value={formVatFilerResponsible} onChange={setFormVatFilerResponsible}
          clearable searchable description="เลือกจาก role: data_entry_and_service" />
        <Select label="ผู้คีย์เอกสาร" placeholder="เลือกผู้คีย์เอกสาร" data={documentEntryUserOptions}
          value={formDocumentEntryResponsible} onChange={setFormDocumentEntryResponsible}
          clearable searchable description="เลือกจาก role: data_entry_and_service, data_entry" />
        <Textarea label="หมายเหตุ" placeholder="หมายเหตุการจัดงาน"
          value={formNote} onChange={(e) => setFormNote(e.target.value)} rows={3} />
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={() => { onClose(); resetForm() }}>ยกเลิก</Button>
          <Button onClick={onSubmit} loading={isSubmitting} radius="lg">
            {formMode === 'create' ? 'สร้าง' : 'บันทึก'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
