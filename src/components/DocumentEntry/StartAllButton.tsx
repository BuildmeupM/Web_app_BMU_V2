/**
 * Start All Button Component
 * ปุ่มสำหรับเริ่มต้นทุกประเภทเอกสารที่ยังไม่เริ่มพร้อมกัน
 */

import { useState } from 'react'
import { Button, Group, Text } from '@mantine/core'
import { useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbBolt, TbCheck } from 'react-icons/tb'
import documentEntryWorkService, { DocumentEntryWork } from '../../services/documentEntryWorkService'

interface StartAllButtonProps {
  entry: DocumentEntryWork
  disabled?: boolean
}

export default function StartAllButton({ entry, disabled = false }: StartAllButtonProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  // Check which document types need to be started
  const pendingTypes: Array<'wht' | 'vat' | 'non_vat'> = []
  
  if (
    entry.wht_document_count > 0 &&
    (entry.wht_entry_status === null || entry.wht_entry_status === 'ยังไม่ดำเนินการ')
  ) {
    pendingTypes.push('wht')
  }
  
  if (
    entry.vat_document_count > 0 &&
    (entry.vat_entry_status === null || entry.vat_entry_status === 'ยังไม่ดำเนินการ')
  ) {
    pendingTypes.push('vat')
  }
  
  if (
    entry.non_vat_document_count > 0 &&
    (entry.non_vat_entry_status === null || entry.non_vat_entry_status === 'ยังไม่ดำเนินการ')
  ) {
    pendingTypes.push('non_vat')
  }

  const handleStartAll = async () => {
    if (pendingTypes.length === 0) {
      notifications.show({
        title: 'ไม่สามารถเริ่มต้นได้',
        message: 'ไม่มีเอกสารที่รอดำเนินการ',
        color: 'orange',
        icon: <TbCheck size={16} />,
      })
      return
    }

    setIsLoading(true)
    try {
      // Start all pending types in parallel
      const promises = pendingTypes.map((docType) =>
        documentEntryWorkService.updateStatus(entry.id, {
          document_type: docType,
          status: 'กำลังดำเนินการ',
        })
      )
      
      await Promise.all(promises)

      notifications.show({
        title: 'สำเร็จ',
        message: `เริ่มต้น ${pendingTypes.length} ประเภทเอกสารสำเร็จ`,
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
    } catch (error: any) {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error?.response?.data?.message || 'ไม่สามารถเริ่มต้นได้',
        color: 'red',
        icon: <TbCheck size={16} />,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (pendingTypes.length === 0) {
    return null
  }

  return (
    <Group gap="xs" p="md" style={{ backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
      <Text size="sm" c="dimmed">
        เริ่มต้นทั้งหมด
      </Text>
      <Text size="sm" fw={500}>
        มี {pendingTypes.length} ประเภทเอกสารที่รอดำเนินการ
      </Text>
      <Button
        size="sm"
        leftSection={<TbBolt size={16} />}
        color="green"
        onClick={handleStartAll}
        disabled={disabled || isLoading}
        loading={isLoading}
        ml="auto"
      >
        เริ่มต้นทั้งหมด
      </Button>
    </Group>
  )
}
