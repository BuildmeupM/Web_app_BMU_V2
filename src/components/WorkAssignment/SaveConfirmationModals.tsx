/**
 * SaveConfirmationModals — กลุ่ม Modals สำหรับยืนยันการบันทึกข้อมูลจัดงาน
 * Includes: TaxMonthModal, IncompleteDataModal, DuplicateDataModal
 * Extracted from WorkAssignment page (lines 4107-4528)
 */
import {
  Modal, Stack, Text, Grid, NumberInput, Select, Group, Button,
  Alert, Table, Badge,
} from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'
import { THAI_MONTHS } from './constants'
import { getCurrentTaxMonth } from './helpers'
import type { PreviewDataItem } from './types'
import type { WorkAssignment as WorkAssignmentType } from '../../services/workAssignmentsService'
import type { Client } from '../../services/clientsService'

interface SaveConfirmationModalsProps {
  // Tax Month Modal
  taxMonthModalOpened: boolean
  setTaxMonthModalOpened: (v: boolean) => void
  selectedTaxYear: number | null
  setSelectedTaxYear: (v: number | null) => void
  selectedTaxMonth: number | null
  setSelectedTaxMonth: (v: number | null) => void
  // Incomplete Data Modal
  incompleteDataModalOpened: boolean
  setIncompleteDataModalOpened: (v: boolean) => void
  incompleteItems: Array<{ build: string; missingFields: string[] }>
  // Duplicate Data Modal
  duplicateDataModalOpened: boolean
  setDuplicateDataModalOpened: (v: boolean) => void
  duplicateItems: WorkAssignmentType[]
  // Data
  previewData: PreviewDataItem[]
  allClients: Client[]
  isSaving: boolean
  // Handlers
  onTaxMonthConfirm: () => void
  onIncompleteDataConfirm: () => void
  onDuplicateDataConfirm: () => void
}

export default function SaveConfirmationModals({
  taxMonthModalOpened, setTaxMonthModalOpened,
  selectedTaxYear, setSelectedTaxYear, selectedTaxMonth, setSelectedTaxMonth,
  incompleteDataModalOpened, setIncompleteDataModalOpened, incompleteItems,
  duplicateDataModalOpened, setDuplicateDataModalOpened, duplicateItems,
  previewData, allClients, isSaving,
  onTaxMonthConfirm, onIncompleteDataConfirm, onDuplicateDataConfirm,
}: SaveConfirmationModalsProps) {
  return (
    <>
      {/* Tax Month Selection Modal */}
      <Modal
        opened={taxMonthModalOpened}
        onClose={() => { if (!isSaving) setTaxMonthModalOpened(false) }}
        title="เลือกเดือนภาษีที่ต้องการจัดงาน" size="md"
        closeOnClickOutside={!isSaving} closeOnEscape={!isSaving} withCloseButton={!isSaving}
      >
        <Stack>
          <Text size="sm" c="dimmed">กรุณาเลือกเดือนภาษีที่ต้องการจัดงาน</Text>
          <Grid>
            <Grid.Col span={6}>
              <NumberInput label="ปี (พ.ศ.)"
                value={selectedTaxYear || getCurrentTaxMonth().year}
                onChange={(value) => setSelectedTaxYear(typeof value === 'number' ? value : parseInt(value as string) || null)}
                min={2000} max={2100} required
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Select label="เดือน" placeholder="เลือกเดือน"
                value={selectedTaxMonth?.toString() || getCurrentTaxMonth().month.toString()}
                onChange={(value) => setSelectedTaxMonth(value ? parseInt(value) : null)}
                data={THAI_MONTHS} required searchable
              />
            </Grid.Col>
          </Grid>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setTaxMonthModalOpened(false)} disabled={isSaving}>ยกเลิก</Button>
            <Button color="blue" disabled={isSaving} onClick={onTaxMonthConfirm}>ยืนยัน</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Incomplete Data Warning Modal */}
      <Modal
        opened={incompleteDataModalOpened}
        onClose={() => { if (!isSaving) setIncompleteDataModalOpened(false) }}
        title="พบข้อมูลบางส่วนที่ไม่ได้กรอก" size="xl"
        closeOnClickOutside={!isSaving} closeOnEscape={!isSaving} withCloseButton={!isSaving}
      >
        <Stack>
          <Alert color="yellow" icon={<TbAlertCircle size={16} />}>
            <Text fw={500} mb="xs">พบ {incompleteItems.length} รายการที่มีข้อมูลไม่ครบ</Text>
            <Text size="sm" mb="xs">ระบบจะบันทึกเฉพาะข้อมูลที่กรอกแล้ว คุณต้องการดำเนินการต่อหรือไม่?</Text>
            {selectedTaxYear && selectedTaxMonth && (
              <Text size="sm" fw={500} c="orange">
                เดือนภาษีที่จะบันทึก: {THAI_MONTHS.find((m) => m.value === selectedTaxMonth.toString())?.label} {selectedTaxYear}
              </Text>
            )}
          </Alert>
          <Table.ScrollContainer minWidth={800}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Build Code</Table.Th>
                  <Table.Th>ชื่อบริษัท</Table.Th>
                  <Table.Th>ข้อมูลที่ขาดหายไป</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {incompleteItems.map((item) => {
                  const previewItem = previewData.find((p) => p.build === item.build)
                  const companyName = previewItem?.company_name ||
                    allClients.find((c) => c.build === item.build)?.company_name || '-'
                  return (
                    <Table.Tr key={item.build}>
                      <Table.Td><Text fw={500}>{item.build}</Text></Table.Td>
                      <Table.Td><Text size="sm">{companyName}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{item.missingFields.join(', ')}</Text></Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setIncompleteDataModalOpened(false)} disabled={isSaving}>ยกเลิก</Button>
            <Button color="orange" disabled={isSaving} onClick={onIncompleteDataConfirm}>ยืนยันส่งข้อมูล</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Duplicate Data Warning Modal */}
      <Modal
        opened={duplicateDataModalOpened}
        onClose={() => { if (!isSaving) setDuplicateDataModalOpened(false) }}
        title="พบข้อมูลซ้ำในเดือนภาษีนี้" size="xl"
        closeOnClickOutside={!isSaving} closeOnEscape={!isSaving} withCloseButton={!isSaving}
      >
        <Stack>
          <Alert color="orange" icon={<TbAlertCircle size={16} />}>
            <Text fw={500} mb="xs">
              พบ {duplicateItems.length} รายการที่มีข้อมูลซ้ำในเดือนภาษี{' '}
              {selectedTaxMonth ? THAI_MONTHS.find((m) => m.value === selectedTaxMonth.toString())?.label : selectedTaxMonth}/{selectedTaxYear}
            </Text>
            <Text size="sm">
              ระบบจะไม่ทับข้อมูลเดิมของ Build code เหล่านี้ และจะบันทึกเฉพาะข้อมูลใหม่ที่ยังไม่เคยมีการจัดงานมาก่อน
            </Text>
            <Text size="xs" c="dimmed" mt="xs">
              หมายเหตุ: ระบบจะแสดงเฉพาะ Build code ที่มีข้อมูลซ้ำจริงๆ ในเดือนภาษีที่เลือก และจะข้ามการบันทึกข้อมูลเหล่านี้
            </Text>
          </Alert>
          <Table.ScrollContainer minWidth={800}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Build Code</Table.Th>
                  <Table.Th>ชื่อบริษัท</Table.Th>
                  <Table.Th>เดือนภาษีที่ซ้ำ</Table.Th>
                  <Table.Th>ข้อมูลเดิม</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {duplicateItems
                  .filter((duplicate) => {
                    const previewItem = previewData.find(
                      (item) => item.build === duplicate.build &&
                        item.target_tax_year === duplicate.assignment_year &&
                        item.target_tax_month === duplicate.assignment_month
                    )
                    return !!previewItem
                  })
                  .map((duplicate) => {
                    const previewItem = previewData.find(
                      (item) => item.build === duplicate.build &&
                        item.target_tax_year === duplicate.assignment_year &&
                        item.target_tax_month === duplicate.assignment_month
                    )
                    return (
                      <Table.Tr key={`${duplicate.build}_${duplicate.assignment_year}_${duplicate.assignment_month}`}>
                        <Table.Td><Text fw={500}>{duplicate.build}</Text></Table.Td>
                        <Table.Td><Text size="sm">{duplicate.company_name || previewItem?.company_name || '-'}</Text></Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" color="orange">
                            {THAI_MONTHS.find((m) => m.value === duplicate.assignment_month.toString())?.label} {duplicate.assignment_year}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap="xs">
                            {duplicate.accounting_responsible_name && <Text size="xs">บัญชี: {duplicate.accounting_responsible_name}</Text>}
                            {duplicate.tax_inspection_responsible_name && <Text size="xs">ตรวจภาษี: {duplicate.tax_inspection_responsible_name}</Text>}
                            {duplicate.wht_filer_responsible_name && <Text size="xs">WHT: {duplicate.wht_filer_responsible_name}</Text>}
                            {duplicate.vat_filer_responsible_name && <Text size="xs">VAT: {duplicate.vat_filer_responsible_name}</Text>}
                            {duplicate.document_entry_responsible_name && <Text size="xs">คีย์เอกสาร: {duplicate.document_entry_responsible_name}</Text>}
                          </Stack>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setDuplicateDataModalOpened(false)} disabled={isSaving}>ยกเลิก</Button>
            <Button color="green" disabled={isSaving} onClick={onDuplicateDataConfirm}>บันทึกเฉพาะข้อมูลใหม่</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
