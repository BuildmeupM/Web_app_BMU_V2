/**
 * Modal ยืนยันก่อนเปิดฟอร์มสถานะภาษี
 * แสดงเมื่อบริษัทมีข้อมูลในส่วน สอบถามและตอบกลับ หรือ ส่งงานยื่นภาษี
 * แสดงเนื้อหาการตอบกลับ/ความเห็นจริงในป๊อปอัพ และให้ผู้ใช้พิมพ์ yes ถึงจะปิดได้
 */

import { useState, useEffect } from 'react'
import { Modal, Text, TextInput, Button, Stack, Box, Grid, Group } from '@mantine/core'
import {
  isAcknowledgmentKeyword,
  ACKNOWLEDGMENT_SECTIONS,
  type RecordWithAcknowledgmentFields,
} from '../../utils/taxAcknowledgmentUtils'

function hasValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

interface AcknowledgmentModalProps {
  opened: boolean
  onClose: () => void
  /** ชื่อส่วนที่มีข้อมูล (ใช้เมื่อไม่ส่ง record) */
  sectionsWithData: string[]
  /** ข้อมูล record เพื่อแสดงเนื้อหาการตอบกลับ/ความเห็น (ถ้ามี) */
  record?: RecordWithAcknowledgmentFields | null
  onConfirm: () => void
}

export default function AcknowledgmentModal({
  opened,
  onClose,
  sectionsWithData,
  record,
  onConfirm,
}: AcknowledgmentModalProps) {
  const [inputValue, setInputValue] = useState('')

  const canConfirm = isAcknowledgmentKeyword(inputValue)
  const sectionsWithContent = record ? ACKNOWLEDGMENT_SECTIONS : []

  useEffect(() => {
    if (!opened) setInputValue('')
  }, [opened])

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm()
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="กรุณาอ่านและยืนยัน"
      size="xl"
      styles={{ content: { maxWidth: '92vw' } }}
      closeOnClickOutside={false}
      closeOnEscape={true}
      withCloseButton={true}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          กรุณาอ่านข้อมูลในส่วนต่อไปนี้และยืนยันว่าทราบก่อนเปิดฟอร์มสถานะภาษีประจำเดือน
        </Text>
        {record && sectionsWithContent.length > 0 ? (
          <Grid gutter="md">
            {sectionsWithContent.map((section) => (
              <Grid.Col key={section.key} span={{ base: 12, sm: 6 }}>
                <Box>
                  <Text size="sm" fw={600} c="orange" mb={4}>
                    {section.label}
                  </Text>
                  <Stack gap={6}>
                    {section.fieldLabels.map(({ key, label: fieldLabel }) => {
                      const value = record[key]
                      const displayText = hasValue(value) ? String(value).trim() : '(ไม่มีข้อมูล)'
                      return (
                        <Box key={key} p="xs" bg="gray.0" style={{ borderRadius: 8 }}>
                          <Text size="xs" c="dimmed" mb={2}>
                            {fieldLabel}
                          </Text>
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} c={hasValue(value) ? undefined : 'dimmed'}>
                            {displayText}
                          </Text>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              </Grid.Col>
            ))}
          </Grid>
        ) : (
          <Stack gap="xs">
            {sectionsWithData.map((label) => (
              <Text key={label} size="sm">
                • {label}
              </Text>
            ))}
          </Stack>
        )}
        <Text size="sm" fw={500}>
          เมื่ออ่านข้อมูลครบและเข้าใจแล้วพิมพ์คำว่า <Text component="span" fw={700} c="orange">Yes</Text> เพื่อเปิดแถบด้านใน
        </Text>
        <TextInput
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (isAcknowledgmentKeyword(inputValue)) {
                onConfirm()
                onClose()
              }
            }
          }}
          placeholder="พิมพ์ yes เพื่อยืนยัน"
          size="md"
        />
        <Group justify="flex-end" gap="md">
          <Button
            variant="outline"
            color="gray"
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <Button
            color="orange"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            ยืนยันและเปิดฟอร์ม
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
