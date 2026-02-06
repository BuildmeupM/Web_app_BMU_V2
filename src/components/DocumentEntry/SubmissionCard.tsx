/**
 * Submission Card Component
 * Card สำหรับแสดงข้อมูลแต่ละประเภทเอกสาร (WHT/VAT/Non-VAT) และปุ่มเริ่มต้น/เสร็จสิ้น
 */

import { Card, Text, Badge, Group, Button, Stack } from '@mantine/core'
import { useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbCheck, TbBolt, TbClock } from 'react-icons/tb'
import documentEntryWorkService, { UpdateStatusRequest } from '../../services/documentEntryWorkService'
import dayjs from 'dayjs'

interface SubmissionCardProps {
  documentType: 'wht' | 'vat' | 'non_vat'
  documentCount: number
  status: 'ยังไม่ดำเนินการ' | 'กำลังดำเนินการ' | 'ดำเนินการเสร็จแล้ว' | null
  startDatetime?: string | null
  completedDatetime?: string | null
  entryId: string
  disabled?: boolean
}

const documentTypeLabels = {
  wht: 'เอกสารหัก ณ ที่จ่าย',
  vat: 'เอกสารมีภาษีมูลค่าเพิ่ม',
  non_vat: 'เอกสารไม่มีภาษีมูลค่าเพิ่ม',
}

const documentTypeColors = {
  wht: 'blue',
  vat: 'orange',
  non_vat: 'purple',
}

export default function SubmissionCard({
  documentType,
  documentCount,
  status,
  startDatetime,
  completedDatetime,
  entryId,
  disabled = false,
}: SubmissionCardProps) {
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation(
    (data: UpdateStatusRequest) => documentEntryWorkService.updateStatus(entryId, data),
    {
      onSuccess: async () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'อัพเดทสถานะสำเร็จ',
          color: 'green',
          icon: <TbCheck size={16} />,
        })
        // Invalidate and refetch queries immediately
        queryClient.invalidateQueries(
          { queryKey: ['document-entry-work'], exact: false },
          { refetchType: 'active' }
        )
        // Force refetch active queries to ensure UI updates immediately
        await queryClient.refetchQueries(
          { queryKey: ['document-entry-work'], exact: false, type: 'active' },
          { cancelRefetch: false }
        )
      },
      onError: (error: any) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: error?.response?.data?.message || 'ไม่สามารถอัพเดทสถานะได้',
          color: 'red',
          icon: <TbCheck size={16} />,
        })
      },
    }
  )

  const handleStart = () => {
    updateStatusMutation.mutate({
      document_type: documentType,
      status: 'กำลังดำเนินการ',
    })
  }

  const handleComplete = () => {
    updateStatusMutation.mutate({
      document_type: documentType,
      status: 'ดำเนินการเสร็จแล้ว',
    })
  }

  const getStatusBadge = () => {
    if (status === 'ดำเนินการเสร็จแล้ว') {
      return (
        <Badge
          color="green"
          variant="outline"
          style={{
            borderColor: '#51cf66',
            color: '#51cf66',
            backgroundColor: 'transparent'
          }}
        >
          เสร็จสิ้น
        </Badge>
      )
    } else if (status === 'กำลังดำเนินการ') {
      return (
        <Badge color="yellow" variant="light">
          กำลังดำเนินการ
        </Badge>
      )
    } else {
      return (
        <Badge color="gray" variant="light">
          รอดำเนินการ
        </Badge>
      )
    }
  }

  const formatDatetime = (datetime: string | null | undefined): string => {
    if (!datetime) return '-'
    // Add 7 hours to convert from UTC to Thailand timezone (UTC+7)
    return dayjs(datetime).add(7, 'hour').format('DD/MM/YYYY HH:mm')
  }

  return (
    <Card withBorder radius="md" p="md" style={{ height: '100%' }}>
      <Stack gap="sm">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Text size="sm" fw={600}>
            {documentTypeLabels[documentType]}
          </Text>
          {/* แสดง badge เฉพาะเมื่อสถานะไม่ใช่ "เสร็จแล้ว" เพราะมีปุ่ม "เสร็จสิ้น" แสดงอยู่แล้ว */}
          {status !== 'ดำเนินการเสร็จแล้ว' && getStatusBadge()}
        </Group>

        {/* Document Count */}
        <Text size="lg" fw={700} c={documentTypeColors[documentType]}>
          {documentCount} รายการ
        </Text>

        {/* Timestamps */}
        <Stack gap="xs">
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              เวลาเริ่มต้น:
            </Text>
            <Text size="xs">{formatDatetime(startDatetime)}</Text>
          </Group>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              วันเวลาดำเนินการเสร็จ:
            </Text>
            <Text size="xs">{formatDatetime(completedDatetime)}</Text>
          </Group>
        </Stack>

        {/* Action Button */}
        {documentCount > 0 && (
          <Button
            fullWidth
            leftSection={status === 'ยังไม่ดำเนินการ' ? <TbBolt size={16} /> : <TbCheck size={16} />}
            color={status === 'ยังไม่ดำเนินการ' ? 'green' : 'green'}
            variant={status === 'ยังไม่ดำเนินการ' ? 'light' : 'outline'}
            onClick={status === 'ยังไม่ดำเนินการ' ? handleStart : handleComplete}
            disabled={disabled || updateStatusMutation.isLoading || status === 'ดำเนินการเสร็จแล้ว'}
            loading={updateStatusMutation.isLoading}
            mt="auto"
            style={
              status !== 'ยังไม่ดำเนินการ'
                ? {
                  borderColor: '#51cf66',
                  color: '#51cf66',
                  backgroundColor: 'transparent',
                }
                : undefined
            }
          >
            {status === 'ยังไม่ดำเนินการ' ? 'เริ่มต้น' : 'เสร็จสิ้น'}
          </Button>
        )}
      </Stack>
    </Card>
  )
}
