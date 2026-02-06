/**
 * Bot Submission Section Component
 * Component สำหรับกรอกข้อมูลบอทอัตโนมัติ (รองรับหลายบอท, OCR field)
 */

import { useState, useCallback } from 'react'
import { Stack, Text, Select, NumberInput, Textarea, Button, Group, ActionIcon, Card, SimpleGrid } from '@mantine/core'
import { TbPlus, TbTrash } from 'react-icons/tb'
import { DocumentEntryWorkBot } from '../../services/documentEntryWorkService'

const BOT_TYPES: Array<{
  value: DocumentEntryWorkBot['bot_type']
  label: string
}> = [
  { value: 'Shopee (Thailand)', label: 'Shopee (Thailand)' },
  { value: 'SPX Express (Thailand)', label: 'SPX Express (Thailand)' },
  { value: 'Lazada Limited (Head Office)', label: 'Lazada Limited (Head Office)' },
  { value: 'Lazada Express Limited', label: 'Lazada Express Limited' },
  { value: 'ระบบ OCR', label: 'ระบบ OCR' },
]

interface BotSubmissionSectionProps {
  bots: DocumentEntryWorkBot[]
  onChange: (bots: DocumentEntryWorkBot[]) => void
  disabled?: boolean
}

export default function BotSubmissionSection({ bots, onChange, disabled = false }: BotSubmissionSectionProps) {
  const handleAddBot = useCallback(() => {
    const newBot: DocumentEntryWorkBot = {
      bot_type: 'Shopee (Thailand)',
      document_count: 0, // Keep as 0 for backend, but display as empty
      ocr_additional_info: null,
    }
    onChange([...bots, newBot])
  }, [bots, onChange])

  const handleRemoveBot = useCallback(
    (index: number) => {
      const newBots = bots.filter((_, i) => i !== index)
      onChange(newBots)
    },
    [bots, onChange]
  )

  const handleBotChange = useCallback(
    (index: number, field: keyof DocumentEntryWorkBot, value: any) => {
      const newBots = [...bots]
      newBots[index] = {
        ...newBots[index],
        [field]: value,
      }
      onChange(newBots)
    },
    [bots, onChange]
  )

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <div>
          <Text size="lg" fw={600}>
            ส่วนการส่งข้อมูลบอทอัตโนมัติ
          </Text>
          <Text size="sm" c="dimmed">
            เพิ่มบอทสำหรับการส่งข้อมูลอัตโนมัติ
          </Text>
        </div>
        <Button
          leftSection={<TbPlus size={16} />}
          onClick={handleAddBot}
          disabled={disabled}
          variant="light"
        >
          เพิ่มบอท
        </Button>
      </Group>

      {bots.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          ยังไม่มีบอทที่เพิ่ม กรุณากดปุ่ม "เพิ่มบอท" เพื่อเพิ่มบอท
        </Text>
      ) : (
        <Stack gap="md">
          {bots.map((bot, index) => (
            <Card key={index} withBorder padding="md">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Text size="sm" fw={500}>
                    บอท #{index + 1}
                  </Text>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => handleRemoveBot(index)}
                    disabled={disabled}
                  >
                    <TbTrash size={16} />
                  </ActionIcon>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Select
                    label="ประเภทบอท"
                    placeholder="เลือกประเภทบอท"
                    data={BOT_TYPES}
                    value={bot.bot_type}
                    onChange={(val) => handleBotChange(index, 'bot_type', val as DocumentEntryWorkBot['bot_type'])}
                    disabled={disabled}
                    required
                  />

                  <NumberInput
                    label="จำนวนเอกสาร"
                    placeholder="กรอกจำนวนเอกสาร"
                    value={bot.document_count === 0 ? '' : bot.document_count}
                    onChange={(val) => handleBotChange(index, 'document_count', typeof val === 'number' ? val : 0)}
                    min={0}
                    disabled={disabled}
                    required
                    allowNegative={false}
                  />
                </SimpleGrid>

                {bot.bot_type === 'ระบบ OCR' && (
                  <Textarea
                    label="ข้อมูลเพิ่มเติมสำหรับระบบ OCR"
                    placeholder="กรอกข้อมูลเพิ่มเติมสำหรับระบบ OCR"
                    value={bot.ocr_additional_info || ''}
                    onChange={(e) => handleBotChange(index, 'ocr_additional_info', e.target.value || null)}
                    disabled={disabled}
                    minRows={3}
                  />
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
