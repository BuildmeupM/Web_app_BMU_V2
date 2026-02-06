/**
 * Document Keying Section Component
 * Component สำหรับกรอกจำนวนเอกสารแต่ละประเภท (WHT, VAT, Non-VAT)
 */

import { Stack, Text, NumberInput, SimpleGrid } from '@mantine/core'

interface DocumentKeyingSectionProps {
  whtDocumentCount: number
  vatDocumentCount: number
  nonVatDocumentCount: number
  onWhtChange: (value: number | '') => void
  onVatChange: (value: number | '') => void
  onNonVatChange: (value: number | '') => void
  disabled?: boolean
  vatDisabled?: boolean // Disable VAT field if company doesn't have VAT registration
}

export default function DocumentKeyingSection({
  whtDocumentCount,
  vatDocumentCount,
  nonVatDocumentCount,
  onWhtChange,
  onVatChange,
  onNonVatChange,
  disabled = false,
  vatDisabled = false,
}: DocumentKeyingSectionProps) {
  return (
    <Stack gap="md">
      <Text size="lg" fw={600}>
        ส่วนการคีย์เอกสาร
      </Text>
      <Text size="sm" c="dimmed">
        กรอกจำนวนเอกสารแต่ละประเภท
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <NumberInput
          label="เอกสารมีหัก ณ ที่จ่าย (WHT)"
          placeholder="กรอกจำนวนเอกสาร"
          value={whtDocumentCount === 0 ? '' : whtDocumentCount}
          onChange={onWhtChange}
          min={0}
          disabled={disabled}
          required
          allowNegative={false}
        />

        <NumberInput
          label="เอกสารมีภาษีมูลค่าเพิ่ม (VAT)"
          placeholder={vatDisabled ? 'บริษัทนี้ยังไม่จดภาษีมูลค่าเพิ่ม' : 'กรอกจำนวนเอกสาร'}
          value={vatDocumentCount === 0 ? '' : vatDocumentCount}
          onChange={onVatChange}
          min={0}
          disabled={disabled || vatDisabled}
          required
          allowNegative={false}
        />

        <NumberInput
          label="เอกสารไม่มีภาษีมูลค่าเพิ่ม (Non-VAT)"
          placeholder="กรอกจำนวนเอกสาร"
          value={nonVatDocumentCount === 0 ? '' : nonVatDocumentCount}
          onChange={onNonVatChange}
          min={0}
          disabled={disabled}
          required
          allowNegative={false}
        />
      </SimpleGrid>
    </Stack>
  )
}
