/**
 * useWorkAssignmentMutations — Custom hook for all mutation operations
 * Extracted from WorkAssignment page (~L522-653)
 */

import { useMutation, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbCheck, TbAlertCircle } from 'react-icons/tb'
import workAssignmentsService, {
  WorkAssignment as WorkAssignmentType,
} from '../../services/workAssignmentsService'
import { getErrorMessage } from '../../types/errors'

interface MutationCallbacks {
  onCreateSuccess?: () => void
  onUpdateSuccess?: () => void
  onResetSuccess?: () => void
  onDeleteSuccess?: () => void
  onBulkSyncSuccess?: (data: { successCount: number; total: number }) => void
}

export function useWorkAssignmentMutations(callbacks: MutationCallbacks = {}) {
  const queryClient = useQueryClient()

  const createMutation = useMutation(workAssignmentsService.create, {
    onSuccess: () => {
      queryClient.invalidateQueries(['work-assignments'])
      callbacks.onCreateSuccess?.()
      notifications.show({
        title: 'สำเร็จ',
        message: 'สร้างการจัดงานเรียบร้อยแล้ว',
        color: 'green',
        icon: TbCheck({ size: 16 }),
      })
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: getErrorMessage(error) || 'ไม่สามารถสร้างการจัดงานได้',
        color: 'red',
        icon: TbAlertCircle({ size: 16 }),
      })
    },
  })

  // Bulk create mutation (no notification — handled by executeBulkSave)
  const createMutationBulk = useMutation(workAssignmentsService.create, {
    onSuccess: () => { /* Notification shown in executeBulkSave */ },
    onError: (error: unknown) => { throw error },
  })

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: Partial<WorkAssignmentType> }) =>
      workAssignmentsService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['work-assignments'])
        callbacks.onUpdateSuccess?.()
        notifications.show({
          title: 'สำเร็จ',
          message: 'แก้ไขการจัดงานเรียบร้อยแล้ว',
          color: 'green',
          icon: TbCheck({ size: 16 }),
        })
      },
      onError: (error: unknown) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: getErrorMessage(error) || 'ไม่สามารถแก้ไขการจัดงานได้',
          color: 'red',
          icon: TbAlertCircle({ size: 16 }),
        })
      },
    }
  )

  const resetMutation = useMutation(workAssignmentsService.resetData, {
    onSuccess: () => {
      queryClient.invalidateQueries(['work-assignments'])
      callbacks.onResetSuccess?.()
      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเซ็ตข้อมูลเรียบร้อยแล้ว',
        color: 'green',
        icon: TbCheck({ size: 16 }),
      })
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: getErrorMessage(error) || 'ไม่สามารถรีเซ็ตข้อมูลได้',
        color: 'red',
        icon: TbAlertCircle({ size: 16 }),
      })
    },
  })

  const deleteMutation = useMutation(workAssignmentsService.deleteAssignment, {
    onSuccess: () => {
      queryClient.invalidateQueries(['work-assignments'])
      callbacks.onDeleteSuccess?.()
      notifications.show({
        title: 'สำเร็จ',
        message: 'ลบการจัดงานเรียบร้อยแล้ว',
        color: 'green',
        icon: TbCheck({ size: 16 }),
      })
    },
    onError: (error: unknown) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: getErrorMessage(error) || 'ไม่สามารถลบการจัดงานได้',
        color: 'red',
        icon: TbAlertCircle({ size: 16 }),
      })
    },
  })

  const bulkSyncMutation = useMutation(
    (params: { year?: string; month?: string }) =>
      workAssignmentsService.bulkSyncUnsynced(params),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['work-assignments'])
        callbacks.onBulkSyncSuccess?.(data)
        notifications.show({
          title: 'ซิงค์ข้อมูลสำเร็จ',
          message: `ซิงค์ข้อมูลสำเร็จ ${data.successCount} จาก ${data.total} รายการ`,
          color: 'green',
          icon: TbCheck({ size: 16 }),
        })
      },
      onError: (error: unknown) => {
        notifications.show({
          title: 'เกิดข้อผิดพลาด',
          message: getErrorMessage(error) || 'ไม่สามารถซิงค์ข้อมูลทั้งหมดได้',
          color: 'red',
          icon: TbAlertCircle({ size: 16 }),
        })
      },
    }
  )

  return {
    createMutation,
    createMutationBulk,
    updateMutation,
    resetMutation,
    deleteMutation,
    bulkSyncMutation,
    queryClient,
  }
}
