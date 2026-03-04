/**
 * WFH Request List Component
 * แสดงรายการการขอ WFH
 */

import { useState, memo } from 'react'
import {
  Stack,
  Group,
  TextInput,
  Select,
  Table,
  Badge,
  Button,
  Pagination,
  Alert,
  Text,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { TbSearch, TbRefresh, TbCheck, TbX, TbFileText } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { wfhService, WFHRequest } from '../../services/leaveService'
import { useAuthStore } from '../../store/authStore'
import { DateInput } from '@mantine/dates'
import ApprovalModal from './ApprovalModal'
import WorkReportForm from './WorkReportForm'
import dayjs from 'dayjs'

interface WFHRequestListProps {
  pendingOnly?: boolean
  showWorkReportOnly?: boolean
}

const WFHRequestList = memo(function WFHRequestList({ pendingOnly = false, showWorkReportOnly = false }: WFHRequestListProps) {
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | null>(pendingOnly ? 'รออนุมัติ' : null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [approvalModalOpened, setApprovalModalOpened] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WFHRequest | null>(null)
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject' | 'vote_approve' | 'vote_reject'>('approve')
  const [workReportModalOpened, setWorkReportModalOpened] = useState(false)
  const [selectedWorkReportRequest, setSelectedWorkReportRequest] = useState<WFHRequest | null>(null)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'
  const isAudit = user?.role === 'audit'
  const canApprove = isAdmin || isAudit

  // Fetch WFH requests
  // For "ข้อมูลการ WFH" (history tab), always show only own data
  // For "ข้อมูลการขอ WFH" (pending tab), show all pending requests for admin
  const { data, isLoading, error, refetch } = useQuery(
    [
      'wfh-requests',
      pendingOnly ? 'pending' : 'all',
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
      pendingOnly ? undefined : user?.employee_id, // Include employee_id for history tab
    ],
    () =>
      wfhService.getAll({
        page,
        limit,
        employee_id: pendingOnly ? undefined : user?.employee_id, // Filter by own employee_id for history tab
        search: search || undefined,
        status: status || undefined,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
      }),
    {
      enabled: !pendingOnly || canApprove,
    }
  )

  // Fetch pending requests if needed
  const { data: pendingData, isLoading: pendingLoading } = useQuery(
    ['wfh-requests', 'pending', page, limit],
    () => wfhService.getPending({ page, limit }),
    {
      enabled: pendingOnly && canApprove,
    }
  )

  const displayData = pendingOnly ? pendingData : data
  const displayLoading = pendingOnly ? pendingLoading : isLoading

  // Helper function to check if work report can be submitted
  const canSubmitWorkReport = (request: WFHRequest): boolean => {
    if (request.status !== 'อนุมัติแล้ว') return false
    if (request.work_report) return false // Already submitted

    // Check if WFH date is today or in the past (allow submission on WFH date)
    const wfhDate = new Date(request.wfh_date)
    wfhDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return wfhDate <= today
  }

  // Helper function to get work report status (ต้องรายงาน, ใกล้กำหนด, เลยกำหนด)
  const getWorkReportStatus = (request: WFHRequest): { status: 'pending' | 'due-soon' | 'overdue' | 'submitted'; daysDiff: number } | null => {
    if (request.status !== 'อนุมัติแล้ว') return null
    if (request.work_report) return { status: 'submitted', daysDiff: 0 }

    const wfhDate = new Date(request.wfh_date)
    wfhDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Calculate days difference (positive = days after WFH date)
    const daysDiff = Math.floor((today.getTime() - wfhDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return null // Not yet WFH date
    if (daysDiff <= 2) return { status: 'due-soon', daysDiff } // Within 1-2 days
    return { status: 'overdue', daysDiff } // Over 2 days
  }

  // Filter data for work report only view
  const filteredData = showWorkReportOnly && displayData
    ? {
      ...displayData,
      data: {
        ...displayData.data,
        wfh_requests: displayData.data.wfh_requests.filter((request: WFHRequest) => {
          const reportStatus = getWorkReportStatus(request)
          return reportStatus && reportStatus.status !== 'submitted'
        }),
      },
    }
    : displayData

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'อนุมัติแล้ว':
        return 'green'
      case 'ไม่อนุมัติ':
        return 'red'
      case 'รออนุมัติ':
        return 'yellow'
      case 'รออนุมัติ (ผู้บริหาร)':
      case 'รอตรวจสอบ':
      case 'รอโหวต':
        return 'orange'
      default:
        return 'gray'
    }
  }

  /**
   * แปลงวันที่เป็นรูปแบบภาษาไทย: "ศุกร์ ที่ 13 กุมภาพันธ์ 2569"
   * @param {string} dateString วันที่ในรูปแบบ YYYY-MM-DD
   * @returns {string} วันที่ในรูปแบบภาษาไทย
   */
  const formatThaiDate = (dateString: string): string => {
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

  if (error) {
    return (
      <Alert icon={<TbRefresh size={16} />} color="red">
        เกิดข้อผิดพลาดในการโหลดข้อมูล
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      {/* Search & Filter */}
      {!pendingOnly && !showWorkReportOnly && (
        <Group>
          <TextInput
            placeholder="ค้นหาตามชื่อพนักงานหรือรหัสพนักงาน..."
            leftSection={<TbSearch size={16} />}
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="สถานะ"
            data={[
              { value: 'รออนุมัติ', label: 'รออนุมัติ' },
              { value: 'อนุมัติแล้ว', label: 'อนุมัติแล้ว' },
              { value: 'ไม่อนุมัติ', label: 'ไม่อนุมัติ' },
            ]}
            value={status}
            onChange={setStatus}
            clearable
            style={{ width: 150 }}
          />
          <DateInput
            placeholder="วันที่เริ่มต้น"
            value={startDate}
            onChange={setStartDate}
            clearable
            style={{ width: 180 }}
          />
          <DateInput
            placeholder="วันที่สิ้นสุด"
            value={endDate}
            onChange={setEndDate}
            clearable
            style={{ width: 180 }}
          />
          <Button
            variant="subtle"
            leftSection={<TbRefresh size={16} />}
            onClick={() => refetch()}
          >
            รีเฟรช
          </Button>
        </Group>
      )}

      {/* Work Report Alert Section */}
      {showWorkReportOnly && (
        <Alert color="orange" icon={<TbFileText size={16} />} mb="md">
          <Text fw={500} mb="xs">📋 รายงานการทำงาน</Text>
          <Text size="sm">
            กรุณาส่งรายงานการทำงานภายใน 1-2 วันหลังจากวันที่ WFH
          </Text>
        </Alert>
      )}

      {/* Table */}
      {displayLoading ? (
        <Text>กำลังโหลดข้อมูล...</Text>
      ) : filteredData?.data.wfh_requests.length === 0 ? (
        <Alert color="blue">
          {showWorkReportOnly ? 'ไม่พบรายการที่ต้องรายงานการทำงาน' : 'ไม่พบข้อมูลการขอ WFH'}
        </Alert>
      ) : (
        <>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>รหัสพนักงาน</Table.Th>
                <Table.Th>ชื่อ-นามสกุล</Table.Th>
                <Table.Th>วันที่ขอ WFH</Table.Th>
                <Table.Th>วันที่ WFH</Table.Th>
                <Table.Th>สถานะ</Table.Th>
                <Table.Th>รายงานการทำงาน</Table.Th>
                {canApprove && pendingOnly && <Table.Th>จัดการ</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredData?.data.wfh_requests.map((request: WFHRequest) => {
                const reportStatus = getWorkReportStatus(request)
                return (
                  <Table.Tr key={request.id}>
                    <Table.Td>{request.employee_id}</Table.Td>
                    <Table.Td>
                      {request.employee_name || '-'}
                      {request.employee_nick_name && (
                        <Text component="span" c="black" ml="xs">
                          ({request.employee_nick_name})
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{formatThaiDate(request.request_date)}</Table.Td>
                    <Table.Td>{formatThaiDate(request.wfh_date)}</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(request.status)}>{request.status}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {request.status === 'อนุมัติแล้ว' ? (
                        request.work_report ? (
                          <Group gap="xs">
                            <Badge color="green" variant="light">ส่งแล้ว</Badge>
                            {request.work_report_submitted_at && (
                              <Text size="xs" c="dimmed">
                                {dayjs(request.work_report_submitted_at).format('DD/MM/YYYY HH:mm')}
                              </Text>
                            )}
                          </Group>
                        ) : canSubmitWorkReport(request) ? (
                          <Stack gap="xs">
                            <Button
                              size="xs"
                              variant="light"
                              color={
                                reportStatus?.status === 'overdue'
                                  ? 'red'
                                  : reportStatus?.status === 'due-soon'
                                    ? 'orange'
                                    : 'blue'
                              }
                              leftSection={<TbFileText size={14} />}
                              onClick={() => {
                                setSelectedWorkReportRequest(request)
                                setWorkReportModalOpened(true)
                              }}
                            >
                              กรอกรายงาน
                            </Button>
                            {reportStatus && (
                              <Text
                                size="xs"
                                c={
                                  reportStatus.status === 'overdue'
                                    ? 'red'
                                    : reportStatus.status === 'due-soon'
                                      ? 'orange'
                                      : 'blue'
                                }
                                fw={500}
                              >
                                {reportStatus.status === 'overdue'
                                  ? `เลยกำหนด ${reportStatus.daysDiff} วัน`
                                  : reportStatus.status === 'due-soon'
                                    ? `ส่งภายใน ${2 - reportStatus.daysDiff} วัน`
                                    : 'ต้องรายงาน'}
                              </Text>
                            )}
                          </Stack>
                        ) : (
                          <Text size="sm" c="dimmed">ยังไม่ถึงวันที่ WFH</Text>
                        )
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    {canApprove && pendingOnly && (
                      <Table.Td>
                        <Group gap="xs">
                          {(isAdmin || (isAudit && request.status === 'รอตรวจสอบ')) && request.status !== 'รอโหวต' && (
                            <>
                              <Tooltip label="อนุมัติ">
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setApprovalMode('approve')
                                    setApprovalModalOpened(true)
                                  }}
                                >
                                  <TbCheck size={18} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="ไม่อนุมัติ">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setApprovalMode('reject')
                                    setApprovalModalOpened(true)
                                  }}
                                >
                                  <TbX size={18} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}
                          {isAudit && request.status === 'รอโหวต' && (
                            <>
                              <Tooltip label="โหวตอนุมัติ">
                                <ActionIcon
                                  variant="subtle"
                                  color="green"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setApprovalMode('vote_approve')
                                    setApprovalModalOpened(true)
                                  }}
                                >
                                  <TbCheck size={18} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="โหวตไม่อนุมัติ">
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setApprovalMode('vote_reject')
                                    setApprovalModalOpened(true)
                                  }}
                                >
                                  <TbX size={18} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>

          {/* Pagination */}
          {filteredData?.data.pagination.totalPages && filteredData.data.pagination.totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination
                value={page}
                onChange={setPage}
                total={filteredData.data.pagination.totalPages}
              />
            </Group>
          )}
        </>
      )}

      {/* Approval Modal */}
      {canApprove && selectedRequest && (
        <ApprovalModal
          opened={approvalModalOpened}
          onClose={() => {
            setApprovalModalOpened(false)
            setSelectedRequest(null)
          }}
          type="wfh"
          requestId={selectedRequest.id}
          requestData={{
            employee_name: selectedRequest.employee_name,
            employee_id: selectedRequest.employee_id,
            wfh_date: selectedRequest.wfh_date,
            status: selectedRequest.status,
          }}
          mode={approvalMode}
        />
      )}

      {/* Work Report Modal */}
      {selectedWorkReportRequest && (
        <WorkReportForm
          opened={workReportModalOpened}
          onClose={() => {
            setWorkReportModalOpened(false)
            setSelectedWorkReportRequest(null)
          }}
          wfhRequestId={selectedWorkReportRequest.id}
          wfhDate={formatThaiDate(selectedWorkReportRequest.wfh_date)}
        />
      )}
    </Stack>
  )
})

export default WFHRequestList
