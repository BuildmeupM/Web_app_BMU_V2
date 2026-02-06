/**
 * Work Report Form Component
 * ฟอร์มสำหรับรายงานการทำงานหลังจาก WFH
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
} from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { wfhService } from '../../services/leaveService'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle } from 'react-icons/tb'

interface WorkReportFormProps {
  opened: boolean
  onClose: () => void
  wfhRequestId: string
  wfhDate: string
}

export default function WorkReportForm({
  opened,
  onClose,
  wfhRequestId,
  wfhDate,
}: WorkReportFormProps) {
  const [workReport, setWorkReport] = useState('')
  const queryClient = useQueryClient()

  // Get WFH request details
  const { data: wfhRequest } = useQuery(
    ['wfh-request', wfhRequestId],
    () => wfhService.getById(wfhRequestId),
    {
      enabled: opened && !!wfhRequestId,
    }
  )

  const submitMutation = useMutation({
    mutationFn: (data: { work_report: string }) =>
      wfhService.submitWorkReport(wfhRequestId, data),
    onSuccess: () => {
      notifications.show({
        title: 'สำเร็จ',
        message: 'ส่งรายงานการทำงานเรียบร้อยแล้ว',
        color: 'green',
      })
      queryClient.invalidateQueries({ queryKey: ['wfh-requests'] })
      queryClient.invalidateQueries({ queryKey: ['wfh-dashboard'] })
      handleClose()
    },
    onError: (error: any) => {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error.response?.data?.message || 'ไม่สามารถส่งรายงานได้',
        color: 'red',
      })
    },
  })

  const handleClose = () => {
    setWorkReport('')
    onClose()
  }

  const handleSubmit = () => {
    if (!workReport.trim()) {
      notifications.show({
        title: 'กรุณากรอกรายงาน',
        message: 'กรุณากรอกรายงานการทำงาน',
        color: 'orange',
      })
      return
    }

    submitMutation.mutate({ work_report: workReport })
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="รายงานการทำงาน"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Alert color="blue">
          <Text size="sm">
            วันที่ WFH: <Badge>{wfhDate}</Badge>
          </Text>
        </Alert>

        <Textarea
          label="รายงานการทำงาน"
          placeholder="กรุณาระบุรายละเอียดงานที่ทำในวัน WFH..."
          value={workReport}
          onChange={(e) => setWorkReport(e.target.value)}
          required
          minRows={6}
          autosize
        />

        <Alert icon={<TbAlertCircle size={16} />} color="orange">
          <Text size="sm">
            กรุณากรอกรายละเอียดงานที่ทำในวัน WFH ให้ครบถ้วน
          </Text>
        </Alert>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitMutation.isPending}
            disabled={!workReport.trim()}
          >
            ส่งรายงาน
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
