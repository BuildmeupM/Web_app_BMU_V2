/**
 * BulkCreateModal — Modal เลือกเดือนภาษีและสถานะบริษัทสำหรับจัดงาน
 * Combines Target Tax Month Selection + Company Status Selection modals
 * Extracted from WorkAssignment page (lines 2388-2738)
 */
import {
  Modal, Stack, Text, Grid, NumberInput, Select, Alert, Group, Button,
  Checkbox, Badge, Divider, Progress,
} from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'
import { THAI_MONTHS } from './constants'
import { getCurrentTaxMonth } from './helpers'
import type { SelectOption } from './types'

interface BulkCreateModalProps {
  // Target Tax Month Modal
  targetTaxYearModalOpened: boolean
  setTargetTaxYearModalOpened: (v: boolean) => void
  targetTaxYear: number | null
  setTargetTaxYear: (v: number | null) => void
  targetTaxMonth: number | null
  setTargetTaxMonth: (v: number | null) => void
  // Bulk Create Modal
  bulkCreateModalOpened: boolean
  setBulkCreateModalOpened: (v: boolean) => void
  selectedCompanyStatuses: string[]
  setSelectedCompanyStatuses: (v: string[]) => void
  companyStatusOptions: SelectOption[]
  // Previous tax month
  selectedPreviousTaxYear: number | null
  setSelectedPreviousTaxYear: (v: number | null) => void
  selectedPreviousTaxMonth: number | null
  setSelectedPreviousTaxMonth: (v: number | null) => void
  // Loading
  isLoadingPreview: boolean
  loadingProgress: { current: number; total: number }
  // Handlers
  handleBulkCreateConfirm: () => void
  setPreviewData: (v: never[]) => void
}

export default function BulkCreateModal({
  targetTaxYearModalOpened, setTargetTaxYearModalOpened,
  targetTaxYear, setTargetTaxYear, targetTaxMonth, setTargetTaxMonth,
  bulkCreateModalOpened, setBulkCreateModalOpened,
  selectedCompanyStatuses, setSelectedCompanyStatuses, companyStatusOptions,
  selectedPreviousTaxYear, setSelectedPreviousTaxYear,
  selectedPreviousTaxMonth, setSelectedPreviousTaxMonth,
  isLoadingPreview, loadingProgress,
  handleBulkCreateConfirm, setPreviewData,
}: BulkCreateModalProps) {
  return (
    <>
      {/* Target Tax Month Selection Modal */}
      <Modal
        opened={targetTaxYearModalOpened}
        onClose={() => { if (!isLoadingPreview) setTargetTaxYearModalOpened(false) }}
        title="เลือกเดือนภาษีที่จะบันทึก" size="md" radius="lg"
        closeOnClickOutside={!isLoadingPreview} closeOnEscape={!isLoadingPreview}
        withCloseButton={!isLoadingPreview}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            กรุณาเลือกเดือนภาษีที่ต้องการจัดงาน (ข้อมูลจะถูกบันทึกสำหรับเดือนภาษีนี้)
          </Text>
          <Grid>
            <Grid.Col span={6}>
              <NumberInput label="ปี (พ.ศ.) *"
                value={targetTaxYear || getCurrentTaxMonth().year}
                onChange={(value) => setTargetTaxYear(typeof value === 'number' ? value : parseInt(value as string) || null)}
                min={2000} max={2100} required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select label="เดือน *" placeholder="เลือกเดือน"
                value={targetTaxMonth?.toString() || getCurrentTaxMonth().month.toString()}
                onChange={(value) => setTargetTaxMonth(value ? parseInt(value) : null)}
                data={THAI_MONTHS} required searchable
              />
            </Grid.Col>
          </Grid>
          <Alert color="orange" variant="outline" icon={<TbAlertCircle size={16} />}
            style={{ backgroundColor: '#fff', borderColor: '#ff6b35', color: '#ff6b35' }}>
            <Text size="sm" style={{ color: '#ff6b35' }}>
              ข้อมูลจะถูกบันทึกสำหรับเดือนภาษี: {targetTaxYear && targetTaxMonth ? `${THAI_MONTHS.find((m) => m.value === targetTaxMonth.toString())?.label} ${targetTaxYear}` : '-'}
            </Text>
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setTargetTaxYearModalOpened(false)} disabled={isLoadingPreview}>ยกเลิก</Button>
            <Button variant="outline" color="orange"
              disabled={!targetTaxYear || !targetTaxMonth || isLoadingPreview}
              onClick={() => {
                if (targetTaxYear && targetTaxMonth) {
                  setTargetTaxYearModalOpened(false)
                  setBulkCreateModalOpened(true)
                  setSelectedCompanyStatuses([])
                  setPreviewData([])
                }
              }}
              style={{ backgroundColor: '#fff', borderColor: '#ff6b35', color: '#ff6b35' }}>
              ดำเนินการต่อ
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Create Modal - Select Company Status */}
      <Modal
        opened={bulkCreateModalOpened}
        onClose={() => { if (!isLoadingPreview) { setBulkCreateModalOpened(false); setSelectedCompanyStatuses([]) } }}
        title="เลือกสถานะบริษัทสำหรับการจัดงาน" size="md" radius="lg"
        closeOnClickOutside={!isLoadingPreview} closeOnEscape={!isLoadingPreview}
        withCloseButton={!isLoadingPreview}
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb="xs">สถานะบริษัท (สามารถเลือกได้หลายรายการ)</Text>
            <Text size="xs" c="dimmed" mb="sm">เลือกสถานะบริษัทที่ต้องการดึงข้อมูล (สามารถเลือกได้หลายรายการ)</Text>
            <Stack gap="xs">
              {companyStatusOptions.map((option) => (
                <Checkbox
                  key={option.value} label={option.label}
                  checked={selectedCompanyStatuses.includes(option.value)}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      setSelectedCompanyStatuses([...selectedCompanyStatuses, option.value])
                    } else {
                      setSelectedCompanyStatuses(selectedCompanyStatuses.filter((s) => s !== option.value))
                    }
                  }}
                />
              ))}
            </Stack>
          </div>

          {/* Quick Select Buttons */}
          <Group gap="xs">
            <Text size="sm" c="dimmed" fw={500}>เลือกด่วน:</Text>
            <Button variant="light" size="xs" onClick={() => {
              const allStatuses = companyStatusOptions.filter((opt) => opt.value !== 'all').map((opt) => opt.value)
              setSelectedCompanyStatuses(allStatuses)
            }}>เลือกทั้งหมด</Button>
            <Button variant="light" size="xs" onClick={() =>
              setSelectedCompanyStatuses(['รายเดือน', 'รายเดือน / วางมือ', 'รายเดือน / จ่ายรายปี', 'รายเดือน / เดือนสุดท้าย'])
            }>รายเดือนทั้งหมด</Button>
            <Button variant="light" size="xs" onClick={() => setSelectedCompanyStatuses([])}>ล้างทั้งหมด</Button>
          </Group>

          {/* Selected Statuses Display */}
          {selectedCompanyStatuses.length > 0 && (
            <Alert color="orange" variant="outline" title="สถานะที่เลือก"
              style={{ backgroundColor: '#fff', borderColor: '#ff6b35', color: '#ff6b35' }}>
              <Group gap="xs" wrap="wrap">
                {selectedCompanyStatuses.map((status) => (
                  <Badge key={status} color="orange" variant="outline"
                    style={{ backgroundColor: '#fff', borderColor: '#ff6b35', color: '#ff6b35' }}>
                    {companyStatusOptions.find((opt) => opt.value === status)?.label || status}
                  </Badge>
                ))}
              </Group>
            </Alert>
          )}

          {/* Previous Tax Month Selection */}
          <Divider label="เลือกเดือนภาษีที่ต้องการดึงข้อมูลเดิม" labelPosition="center" />
          <Grid>
            <Grid.Col span={6}>
              <NumberInput label="ปี (พ.ศ.)"
                value={selectedPreviousTaxYear || (() => {
                  const ct = getCurrentTaxMonth()
                  const prev = new Date(ct.year, ct.month - 2, 1)
                  return prev.getFullYear()
                })()}
                onChange={(value) => setSelectedPreviousTaxYear(typeof value === 'number' ? value : parseInt(value as string) || null)}
                min={2000} max={2100} required description="เลือกปีภาษีที่ต้องการดึงข้อมูลเดิม"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select label="เดือน" placeholder="เลือกเดือน"
                value={selectedPreviousTaxMonth?.toString() || (() => {
                  const ct = getCurrentTaxMonth()
                  const prev = new Date(ct.year, ct.month - 2, 1)
                  return (prev.getMonth() + 1).toString()
                })()}
                onChange={(value) => setSelectedPreviousTaxMonth(value ? parseInt(value) : null)}
                data={THAI_MONTHS} required searchable description="เลือกเดือนภาษีที่ต้องการดึงข้อมูลเดิม"
              />
            </Grid.Col>
          </Grid>
          <Alert color="orange" icon={<TbAlertCircle size={16} />}
            style={{ backgroundColor: 'var(--mantine-color-orange-0)' }}>
            <Text size="sm" c="orange">
              ระบบจะดึงข้อมูลการจัดงานจากเดือนภาษีที่เลือกมาแสดงเป็นข้อมูล "เดิม"
              {selectedPreviousTaxYear && selectedPreviousTaxMonth && (
                <Text component="span" fw={500} c="orange" ml={4}>
                  ({THAI_MONTHS.find((m) => m.value === selectedPreviousTaxMonth.toString())?.label} {selectedPreviousTaxYear})
                </Text>
              )}
            </Text>
          </Alert>

          {/* Loading Progress */}
          {isLoadingPreview && (
            <Alert color="blue"
              title={<Text size="md" fw={600} c="blue">กำลังโหลดข้อมูล....</Text>}
              styles={{ root: { backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3' }, title: { marginBottom: 12 } }}>
              <Stack gap="md">
                {loadingProgress.total > 0 ? (
                  <>
                    <Progress value={Math.min((loadingProgress.current / loadingProgress.total) * 100, 100)}
                      size="lg" radius="xl" color="orange" animated styles={{ root: { height: 8 } }} />
                    <Text size="sm" c="dimmed" ta="center" fw={500}>
                      กำลังโหลด... {loadingProgress.current} / {loadingProgress.total} รายการ
                      {loadingProgress.current > 0 && loadingProgress.total > 0 && (
                        <Text component="span" c="orange" fw={700} ml={4}>
                          ({Math.round((loadingProgress.current / loadingProgress.total) * 100)}%)
                        </Text>
                      )}
                    </Text>
                  </>
                ) : (
                  <>
                    <Progress value={0} size="lg" radius="xl" color="orange" animated styles={{ root: { height: 8 } }} />
                    <Text size="sm" c="dimmed" ta="center" fw={500}>กำลังเตรียมข้อมูล...</Text>
                  </>
                )}
                <Text size="xs" c="dimmed" ta="center">กรุณารอสักครู่... ระบบกำลังดึงข้อมูลจากเดือนก่อนหน้า</Text>
              </Stack>
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => { if (!isLoadingPreview) { setBulkCreateModalOpened(false); setSelectedCompanyStatuses([]) } }}
              disabled={isLoadingPreview}>ยกเลิก</Button>
            <Button onClick={handleBulkCreateConfirm} color="orange" loading={isLoadingPreview}
              disabled={selectedCompanyStatuses.length === 0 || isLoadingPreview}>
              {isLoadingPreview
                ? `กำลังโหลด... ${loadingProgress.current}/${loadingProgress.total}`
                : `ดึงข้อมูล (${selectedCompanyStatuses.length > 0 ? selectedCompanyStatuses.length : 0} รายการ)`}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
