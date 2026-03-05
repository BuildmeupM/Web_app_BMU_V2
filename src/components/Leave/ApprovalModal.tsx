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
  Switch,
} from '@mantine/core'
import { useMutation, useQueryClient, QueryKey } from 'react-query'
import { leaveService, wfhService } from '../../services/leaveService'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle } from 'react-icons/tb'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

// Configure dayjs with Thai locale and Buddhist Era
dayjs.locale('th')
dayjs.extend(buddhistEra)

interface ApiError {
  response?: {
    data?: {
      message?: string
      errors?: Record<string, string[]>
    }
  }
  request?: unknown
  message?: string
}

interface RequestItem {
  id: string
  [key: string]: unknown
}

interface PaginatedData {
  data?: {
    leave_requests?: RequestItem[]
    wfh_requests?: RequestItem[]
    pagination?: {
      total: number
      [key: string]: unknown
    }
  }
}

interface MutationContext {
  previousQueries: [QueryKey, unknown][]
}

interface ApprovalResponse {
  leave_request?: unknown
  wfh_request?: unknown
}

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
  mode: 'approve' | 'reject' | 'vote_approve' | 'vote_reject'
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
  const [requireVote, setRequireVote] = useState(false)
  const queryClient = useQueryClient()

  // Query key for cache operations (leave-requests or wfh-requests)
  const queryKey = type === 'leave' ? 'leave-requests' : 'wfh-requests'
  // Data key inside the response object
  const dataKey = type === 'leave' ? 'leave_requests' : 'wfh_requests'

  // Helper: Extract error message from error response
  const extractErrorMessage = (error: unknown, defaultMsg: string) => {
    let errorMessage = defaultMsg
    let errorTitle = 'เกิดข้อผิดพลาด'

    const apiError = error as ApiError

    if (apiError.response) {
      const errorData = apiError.response.data
      if (errorData?.message) {
        errorMessage = errorData.message
      } else if (errorData?.errors) {
        const errorMessages = Object.values(errorData.errors).flat().filter(Boolean)
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join(', ')
        }
      }
    } else if (apiError.request) {
      errorTitle = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์'
      errorMessage = 'กรุณาตรวจสอบว่า backend server กำลังทำงานอยู่ หรือตรวจสอบการเชื่อมต่อเครือข่าย'
    } else if (apiError.message) {
      errorMessage = apiError.message
    }

    return { errorTitle, errorMessage }
  }

  // Helper: Optimistic update - remove item from all matching query caches
  const optimisticRemoveItem = async (): Promise<MutationContext> => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: [queryKey] })

    // Snapshot all matching queries for rollback
    const previousQueries = queryClient.getQueriesData({ queryKey: [queryKey] })

    // Optimistically remove the approved/rejected item from cache
    queryClient.setQueriesData({ queryKey: [queryKey] }, (old: unknown) => {
      const oldData = old as PaginatedData | undefined
      if (!oldData?.data) return oldData

      const targetData = dataKey === 'leave_requests' ? oldData.data.leave_requests : oldData.data.wfh_requests
      if (!targetData) return oldData

      return {
        ...oldData,
        data: {
          ...oldData.data,
          [dataKey]: targetData.filter((item) => item.id !== requestId),
          pagination: oldData.data.pagination
            ? { ...oldData.data.pagination, total: Math.max(0, oldData.data.pagination.total - 1) }
            : undefined,
        },
      }
    })

    return { previousQueries }
  }

  // Helper: Rollback on error
  const rollbackOnError = (_error: unknown, _variables: unknown, context: unknown) => {
    const ctx = context as MutationContext | undefined
    if (ctx?.previousQueries) {
      ctx.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    }
  }

  const approveMutation = useMutation<
    { success: boolean; data: ApprovalResponse },
    Error,
    { approver_note?: string; require_vote?: boolean } | undefined,
    MutationContext
  >(
    (data) =>
      type === 'leave'
        ? leaveService.approve(requestId, data)
        : wfhService.approve(requestId, data),
    {
      onMutate: optimisticRemoveItem,
      onSuccess: () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'อนุมัติเรียบร้อยแล้ว',
          color: 'green',
        })
        handleClose()
      },
      onError: (error: Error, _variables: { approver_note?: string } | undefined, context: MutationContext | undefined) => {
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
    }
  )

  const rejectMutation = useMutation<
    { success: boolean; data: ApprovalResponse },
    Error,
    { approver_note: string },
    MutationContext
  >(
    (data) =>
      type === 'leave'
        ? leaveService.reject(requestId, data)
        : wfhService.reject(requestId, data),
    {
      onMutate: optimisticRemoveItem,
      onSuccess: () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'ปฏิเสธเรียบร้อยแล้ว',
          color: 'green',
        })
        handleClose()
      },
      onError: (error: Error, _variables: { approver_note: string }, context: MutationContext | undefined) => {
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
    }
  )

  const voteMutation = useMutation<
    { success: boolean; data: { status: string; approveCount: number; rejectCount: number } },
    Error,
    { vote: 'approve' | 'reject'; approver_note?: string },
    MutationContext
  >(
    (data) =>
      type === 'leave'
        ? leaveService.vote(requestId, data)
        : wfhService.vote(requestId, data),
    {
      onMutate: optimisticRemoveItem,
      onSuccess: () => {
        notifications.show({
          title: 'สำเร็จ',
          message: 'บันทึกการโหวตเรียบร้อยแล้ว',
          color: 'green',
        })
        handleClose()
      },
      onError: (error: Error, _variables: { vote: 'approve' | 'reject'; approver_note?: string }, context: MutationContext | undefined) => {
        rollbackOnError(error, _variables, context)
        const { errorTitle, errorMessage } = extractErrorMessage(error, 'ไม่สามารถโหวตได้')
        notifications.show({
          title: errorTitle,
          message: errorMessage,
          color: 'red',
          autoClose: 5000,
        })
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] })
      },
    }
  )

  const handleClose = () => {
    setApproverNote('')
    setRequireVote(false)
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

    if (mode === 'vote_reject' && !approverNote.trim()) {
      notifications.show({
        title: 'กรุณากรอกหมายเหตุ',
        message: 'ต้องกรอกหมายเหตุเมื่อโหวตไม่อนุมัติ',
        color: 'orange',
      })
      return
    }

    if (mode === 'approve') {
      approveMutation.mutate({ approver_note: approverNote.trim() || undefined, require_vote: requireVote })
    } else if (mode === 'reject') {
      rejectMutation.mutate({ approver_note: approverNote.trim() })
    } else if (mode === 'vote_approve') {
      voteMutation.mutate({ vote: 'approve', approver_note: approverNote.trim() || undefined })
    } else if (mode === 'vote_reject') {
      voteMutation.mutate({ vote: 'reject', approver_note: approverNote.trim() })
    }
  }

  const isLoading = approveMutation.isLoading || rejectMutation.isLoading || voteMutation.isLoading

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
          : mode === 'vote_approve'
            ? 'โหวตอนุมัติ'
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
          label={mode === 'approve' ? 'หมายเหตุ (ไม่บังคับ)' : mode === 'vote_approve' ? 'หมายเหตุ (ไม่บังคับ)' : 'หมายเหตุ (บังคับ)'}
          placeholder={
            mode === 'approve' || mode === 'vote_approve'
              ? 'กรอกหมายเหตุเพิ่มเติม (ถ้ามี)'
              : 'กรุณาระบุเหตุผลที่ปฏิเสธ'
          }
          value={approverNote}
          onChange={(e) => setApproverNote(e.target.value)}
          required={mode === 'reject' || mode === 'vote_reject'}
          minRows={3}
        />

        {mode === 'approve' && (
          <Switch
            label="ส่งคำขอนี้เข้าสู่ระบบโหวตของทีม Audit"
            description="หากคำขอนี้มาจากพนักงานฝ่าย Audit ให้เปิดตัวเลือกนี้เพื่อส่งให้ทีมโหวต หากไม่ได้เปิดจะถือเป็นการอนุมัติโดยตรง (ไม่มีผลกับแผนกอื่น)"
            checked={requireVote}
            onChange={(event) => setRequireVote(event.currentTarget.checked)}
            color="blue"
            mt="xs"
          />
        )}

        {(mode === 'reject' || mode === 'vote_reject') && (
          <Alert icon={<TbAlertCircle size={16} />} color="orange">
            ต้องกรอกหมายเหตุเมื่อปฏิเสธ
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            ยกเลิก
          </Button>
          <Button
            color={mode === 'approve' || mode === 'vote_approve' ? 'green' : 'red'}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={(mode === 'reject' || mode === 'vote_reject') && !approverNote.trim()}
          >
            {mode === 'approve' ? 'อนุมัติ' : mode === 'vote_approve' ? 'โหวตอนุมัติ' : 'ปฏิเสธ'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
