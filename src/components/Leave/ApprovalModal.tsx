/**
 * Approval Modal Component
 * Modal สำหรับอนุมัติ/ปฏิเสธการลา/WFH
 */

import { useState } from 'react'
import {
  Modal,
  Stack,
  Textarea,
  Button,
  Group,
  Alert,
  Text,
  Badge,
  Divider,
  Card,
} from '@mantine/core'
import { useMutation, useQueryClient } from 'react-query'
import { leaveService, wfhService } from '../../services/leaveService'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle } from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

interface ApprovalModalProps {
  opened: boolean
  onClose: () => void
  type: 'leave' | 'wfh'
  requestId: string
  requestData?: {
    employee_name?: string
    employee_id?: string
    leave_type?: string
    leave_start_date?: string
    leave_end_date?: string
    wfh_date?: string
    status?: string
  }
  mode: 'approve' | 'reject'
}

export default function ApprovalModal({
  opened,
  onClose,
  type,
  requestId,
  requestData,
  mode,
}: ApprovalModalProps) {
  const [approverNote, setApproverNote] = useState('')
  const queryClient = useQueryClient()

  // Query key for cache operations (leave-requests or wfh-requests)
  const queryKey = type === 'leave' ? 'leave-requests' : 'wfh-requests'
  // Data key inside the response object
  const dataKey = type === 'leave' ? 'leave_requests' : 'wfh_requests'

  // Helper: Extract error message from error response
  const extractErrorMessage = (error: any, defaultMsg: string) => {
    let errorMessage = defaultMsg
    let errorTitle = 'เกิดข้อผิดพลาด'

    if (error.response) {
      const errorData = error.response.data
      if (errorData?.message) {
        errorMessage = errorData.message
      } else if (errorData?.errors) {
        const errorMessages = Object.values(errorData.errors).filter(Boolean)
        if (errorMessages.length > 0) {
          errorMessage = (errorMessages as string[]).join(', ')
        }
      }
    } else if (error.request) {
      errorTitle = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์'
      errorMessage = 'กรุณาตรวจสอบว่า backend server กำลังทำงานอยู่ หรือตรวจสอบการเชื่อมต่อเครือข่าย'
    } else {
      errorMessage = error.message || defaultMsg
    }

    return { errorTitle, errorMessage }
  }

  // Helper: Optimistic update - remove item from all matching query caches
  const optimisticRemoveItem = async () => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: [queryKey] })

    // Snapshot all matching queries for rollback
    const previousQueries = queryClient.getQueriesData({ queryKey: [queryKey] })

    // Optimistically remove the approved/rejected item from cache
    queryClient.setQueriesData({ queryKey: [queryKey] }, (old: any) => {
      if (!old?.data?.[dataKey]) return old
      return {
        ...old,
        data: {
          ...old.data,
          [dataKey]: old.data[dataKey].filter((item: any) => item.id !== requestId),
          pagination: old.data.pagination
            ? { ...old.data.pagination, total: Math.max(0, old.data.pagination.total - 1) }
            : undefined,
        },
      }
    })

    return { previousQueries }
  }

  // Helper: Rollback on error
  const rollbackOnError = (_error: any, _variables: any, context: any) => {
    if (context?.previousQueries) {
      context.previousQueries.forEach(([key, data]: [any, any]) => {
        queryClient.setQueryData(key, data)
      })
    }
  }

  const approveMutation = useMutation({
    mutationFn: (data?: { approver_note?: string }) =>
      type === 'leave'
        ? leaveService.approve(requestId, data)
        : wfhService.approve(requestId, data),
    onMutate: optimisticRemoveItem,
    onSuccess: () => {
      notifications.show({
        title: 'สำเร็จ',
        message: 'อนุมัติเรียบร้อยแล้ว',
        color: 'green',
      })
      handleClose()
    },
    onError: (error: any, _variables: any, context: any) => {
      // Rollback optimistic update
      rollbackOnError(error, _variables, context)

      const { errorTitle, errorMessage } = extractErrorMessage(error, 'ไม่สามารถอนุมัติได้')
      notifications.show({
        title: errorTitle,
        message: errorMessage,
        color: 'red',
        autoClose: 5000,
      })
    },
    onSettled: () => {
      // Always refetch after mutation settles to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (data: { approver_note: string }) =>
      type === 'leave'
        ? leaveService.reject(requestId, data)
        : wfhService.reject(requestId, data),
    onMutate: optimisticRemoveItem,
    onSuccess: () => {
      notifications.show({
        title: 'สำเร็จ',
        message: 'ปฏิเสธเรียบร้อยแล้ว',
        color: 'green',
      })
      handleClose()
    },
    onError: (error: any, _variables: any, context: any) => {
      // Rollback optimistic update
      rollbackOnError(error, _variables, context)

      const { errorTitle, errorMessage } = extractErrorMessage(error, 'ไม่สามารถปฏิเสธได้')
      notifications.show({
        title: errorTitle,
        message: errorMessage,
        color: 'red',
        autoClose: 5000,
      })
    },
    onSettled: () => {
      // Always refetch after mutation settles to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: [queryKey] })
    },
  })

  const handleClose = () => {
    setApproverNote('')
    onClose()
  }

  const handleSubmit = () => {
    // Prevent double-click/multiple submissions
    if (isLoading) {
      return
    }

    if (mode === 'reject' && !approverNote.trim()) {
      notifications.show({
        title: 'กรุณากรอกหมายเหตุ',
        message: 'ต้องกรอกหมายเหตุเมื่อปฏิเสธ',
        color: 'orange',
      })
      return
    }

    if (mode === 'approve') {
      approveMutation.mutate({ approver_note: approverNote.trim() || undefined })
    } else {
      rejectMutation.mutate({ approver_note: approverNote.trim() })
    }
  }

  const isLoading = approveMutation.isLoading || rejectMutation.isLoading

  // Helper function to format date to Thai format
  const formatThaiDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = dayjs(dateString)
    const thaiWeekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ]
    const weekday = thaiWeekdays[date.day()]
    const day = date.date()
    const month = thaiMonths[date.month()]
    const year = date.year() + 543 // Convert to Buddhist Era
    return `${weekday} ที่ ${day} ${month} ${year}`
  }

  // Format date range for leave requests
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return '-'
    if (startDate === endDate) {
      return formatThaiDate(startDate)
    }
    if (endDate) {
      return `${formatThaiDate(startDate)} - ${formatThaiDate(endDate)}`
    }
    return formatThaiDate(startDate)
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        mode === 'approve'
          ? 'อนุมัติ'
          : type === 'wfh'
            ? 'กรอกข้อมูลไม่อนุมัติให้ WFH'
            : 'กรอกข้อมูลไม่อนุมัติให้ลา'
      }
      size="lg"
      centered
      styles={{
        content: {
          maxWidth: '800px',
        },
      }}
    >
      <Stack gap="md">
        {/* Request Info */}
        {requestData && (
          <Card withBorder padding="md" radius="md">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  พนักงาน:
                </Text>
                <Text fw={500}>{requestData.employee_name || '-'}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  รหัสพนักงาน:
                </Text>
                <Text fw={500}>{requestData.employee_id || '-'}</Text>
              </Group>
              {type === 'leave' && (
                <>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      ประเภทการลา:
                    </Text>
                    <Badge>{requestData.leave_type || '-'}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      วันที่ลา:
                    </Text>
                    <Text>
                      {formatDateRange(requestData.leave_start_date, requestData.leave_end_date)}
                    </Text>
                  </Group>
                </>
              )}
              {type === 'wfh' && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    วันที่ WFH:
                  </Text>
                  <Text>{formatThaiDate(requestData.wfh_date || '')}</Text>
                </Group>
              )}
            </Stack>
          </Card>
        )}

        <Divider />

        {/* Approver Note */}
        <Textarea
          label={mode === 'approve' ? 'หมายเหตุ (ไม่บังคับ)' : 'หมายเหตุ (บังคับ)'}
          placeholder={
            mode === 'approve'
              ? 'กรอกหมายเหตุเพิ่มเติม (ถ้ามี)'
              : 'กรุณาระบุเหตุผลที่ปฏิเสธ'
          }
          value={approverNote}
          onChange={(e) => setApproverNote(e.target.value)}
          required={mode === 'reject'}
          minRows={3}
        />

        {mode === 'reject' && (
          <Alert icon={<TbAlertCircle size={16} />} color="orange">
            ต้องกรอกหมายเหตุเมื่อปฏิเสธ
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            ยกเลิก
          </Button>
          <Button
            color={mode === 'approve' ? 'green' : 'red'}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={mode === 'reject' && !approverNote.trim()}
          >
            {mode === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
