/**
 * Salary Advance Request List
 * ตารางรายการคำขอเบิกเงินเดือน พร้อมปุ่มอนุมัติ/ไม่อนุมัติ (Admin/HR)
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Stack,
    Table,
    Badge,
    Button,
    Group,
    Text,
    TextInput,
    Loader,
    Center,
    Pagination,
    Modal,
    Textarea,
    Avatar,
    Tooltip,
    Paper,
} from '@mantine/core'
import {
    TbSearch,
    TbCheck,
    TbX,
    TbCash,
    TbTrash,
} from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../../store/authStore'
import { salaryAdvanceService, SalaryAdvanceRequest } from '../../services/salaryAdvanceService'

interface SalaryAdvanceRequestListProps {
    pendingOnly?: boolean
    refreshTrigger?: number
}

export default function SalaryAdvanceRequestList({ pendingOnly = false, refreshTrigger = 0 }: SalaryAdvanceRequestListProps) {
    const [requests, setRequests] = useState<SalaryAdvanceRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [actionModal, setActionModal] = useState<{
        type: 'approve' | 'reject'
        request: SalaryAdvanceRequest
    } | null>(null)
    const [actionNote, setActionNote] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<SalaryAdvanceRequest | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const user = useAuthStore((state) => state.user)
    const isAdmin = user?.role === 'admin' || user?.role === 'hr'

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true)
            let response
            if (pendingOnly) {
                response = await salaryAdvanceService.getPending({ page, limit: 20 })
            } else {
                response = await salaryAdvanceService.getAll({
                    page,
                    limit: 20,
                    search: search || undefined,
                    employee_id: user?.employee_id || undefined,
                })
            }
            if (response.success) {
                setRequests(response.data.requests)
                setTotalPages(response.data.pagination.totalPages)
            }
        } catch (error) {
            console.error('Failed to fetch salary advance requests:', error)
        } finally {
            setLoading(false)
        }
    }, [page, search, pendingOnly, isAdmin, user?.employee_id])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    // Re-fetch when parent signals a refresh (e.g. after form submit)
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchRequests()
        }
    }, [refreshTrigger]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleAction = async () => {
        if (!actionModal) return

        try {
            setActionLoading(true)
            if (actionModal.type === 'approve') {
                await salaryAdvanceService.approve(actionModal.request.id, {
                    approver_note: actionNote || undefined,
                })
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'อนุมัติคำขอเบิกเงินเดือนเรียบร้อยแล้ว',
                    color: 'green',
                })
            } else {
                if (!actionNote.trim()) {
                    notifications.show({
                        title: 'กรุณาระบุเหตุผล',
                        message: 'ต้องระบุเหตุผลที่ไม่อนุมัติ',
                        color: 'red',
                    })
                    setActionLoading(false)
                    return
                }
                await salaryAdvanceService.reject(actionModal.request.id, {
                    approver_note: actionNote,
                })
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'ปฏิเสธคำขอเบิกเงินเดือนเรียบร้อยแล้ว',
                    color: 'orange',
                })
            }
            setActionModal(null)
            setActionNote('')
            fetchRequests()
        } catch (err: any) {
            const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด'
            notifications.show({ title: 'ข้อผิดพลาด', message: msg, color: 'red' })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            setDeleteLoading(true)
            await salaryAdvanceService.delete(deleteTarget.id)
            notifications.show({
                title: 'สำเร็จ',
                message: 'ยกเลิกคำขอเบิกเงินเดือนเรียบร้อยแล้ว',
                color: 'green',
            })
            setDeleteTarget(null)
            fetchRequests()
        } catch (err: any) {
            const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด'
            notifications.show({ title: 'ข้อผิดพลาด', message: msg, color: 'red' })
        } finally {
            setDeleteLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'รออนุมัติ':
                return <Badge color="yellow" variant="light">รออนุมัติ</Badge>
            case 'อนุมัติแล้ว':
                return <Badge color="green" variant="light">อนุมัติแล้ว</Badge>
            case 'ไม่อนุมัติ':
                return <Badge color="red" variant="light">ไม่อนุมัติ</Badge>
            default:
                return <Badge variant="light">{status}</Badge>
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <Stack gap="md">
            {/* Search */}
            {!pendingOnly && (
                <Group>
                    <TextInput
                        placeholder="ค้นหาชื่อพนักงาน..."
                        leftSection={<TbSearch size={16} />}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.currentTarget.value)
                            setPage(1)
                        }}
                        style={{ flex: 1, maxWidth: 400 }}
                    />
                </Group>
            )}

            {loading ? (
                <Center py="xl">
                    <Loader size="lg" />
                </Center>
            ) : requests.length === 0 ? (
                <Paper p="xl" withBorder>
                    <Center>
                        <Stack align="center" gap="xs">
                            <TbCash size={48} color="var(--mantine-color-gray-4)" />
                            <Text c="dimmed" size="lg">
                                {pendingOnly ? 'ไม่มีคำขอที่รออนุมัติ' : 'ยังไม่มีการขอเบิกเงินเดือน'}
                            </Text>
                        </Stack>
                    </Center>
                </Paper>
            ) : (
                <>
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>พนักงาน</Table.Th>
                                <Table.Th>วันที่ขอ</Table.Th>
                                <Table.Th ta="right">จำนวนเงิน (บาท)</Table.Th>
                                <Table.Th ta="center">สถานะ</Table.Th>
                                <Table.Th>ผู้อนุมัติ</Table.Th>
                                <Table.Th ta="center">จัดการ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {requests.map((req) => (
                                <Table.Tr key={req.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <Avatar size="sm" radius="xl" color="orange">
                                                {(req.employee_nick_name || req.employee_name || '?')[0]}
                                            </Avatar>
                                            <div>
                                                <Text size="sm" fw={500}>{req.employee_name}</Text>
                                                {req.employee_nick_name && (
                                                    <Text size="xs" c="dimmed">({req.employee_nick_name})</Text>
                                                )}
                                            </div>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{formatDate(req.request_date)}</Text>
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Text size="sm" fw={600} c="orange.7">
                                            ฿{formatCurrency(req.amount)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td ta="center">{getStatusBadge(req.status)}</Table.Td>
                                    <Table.Td>
                                        {req.approver_name ? (
                                            <Tooltip label={req.approver_note || 'ไม่มีหมายเหตุ'}>
                                                <Text size="sm">{req.approver_name}</Text>
                                            </Tooltip>
                                        ) : (
                                            <Text size="sm" c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        {req.status === 'รออนุมัติ' ? (
                                            <Group gap="xs" justify="center">
                                                {isAdmin && (
                                                    <>
                                                        <Button
                                                            size="xs"
                                                            color="green"
                                                            variant="light"
                                                            leftSection={<TbCheck size={14} />}
                                                            onClick={() => setActionModal({ type: 'approve', request: req })}
                                                        >
                                                            อนุมัติ
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            color="red"
                                                            variant="light"
                                                            leftSection={<TbX size={14} />}
                                                            onClick={() => setActionModal({ type: 'reject', request: req })}
                                                        >
                                                            ไม่อนุมัติ
                                                        </Button>
                                                    </>
                                                )}
                                                {(req.employee_id === user?.employee_id || isAdmin) && (
                                                    <Button
                                                        size="xs"
                                                        color="gray"
                                                        variant="light"
                                                        leftSection={<TbTrash size={14} />}
                                                        onClick={() => setDeleteTarget(req)}
                                                    >
                                                        ยกเลิก
                                                    </Button>
                                                )}
                                            </Group>
                                        ) : (
                                            <Text size="sm" c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    {totalPages > 1 && (
                        <Center>
                            <Pagination
                                value={page}
                                onChange={setPage}
                                total={totalPages}
                            />
                        </Center>
                    )}
                </>
            )}

            {/* Approve/Reject Modal */}
            <Modal
                opened={!!actionModal}
                onClose={() => {
                    setActionModal(null)
                    setActionNote('')
                }}
                title={
                    <Group gap="xs">
                        {actionModal?.type === 'approve' ? (
                            <TbCheck size={20} color="var(--mantine-color-green-6)" />
                        ) : (
                            <TbX size={20} color="var(--mantine-color-red-6)" />
                        )}
                        <Text fw={600}>
                            {actionModal?.type === 'approve' ? 'อนุมัติคำขอเบิกเงินเดือน' : 'ไม่อนุมัติคำขอเบิกเงินเดือน'}
                        </Text>
                    </Group>
                }
                centered
                size="md"
            >
                {actionModal && (
                    <Stack gap="md">
                        <Paper p="md" withBorder bg="gray.0">
                            <Group justify="space-between">
                                <Text size="sm">พนักงาน: <strong>{actionModal.request.employee_name}</strong></Text>
                                <Text size="sm" fw={600} c="orange.7">
                                    ฿{formatCurrency(actionModal.request.amount)}
                                </Text>
                            </Group>
                        </Paper>

                        <Textarea
                            label={actionModal.type === 'reject' ? 'เหตุผลที่ไม่อนุมัติ *' : 'หมายเหตุ (ถ้ามี)'}
                            placeholder={actionModal.type === 'reject' ? 'ระบุเหตุผล...' : 'หมายเหตุเพิ่มเติม...'}
                            value={actionNote}
                            onChange={(e) => setActionNote(e.currentTarget.value)}
                            minRows={3}
                            required={actionModal.type === 'reject'}
                        />

                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => { setActionModal(null); setActionNote('') }}>
                                ยกเลิก
                            </Button>
                            <Button
                                color={actionModal.type === 'approve' ? 'green' : 'red'}
                                onClick={handleAction}
                                loading={actionLoading}
                            >
                                {actionModal.type === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'}
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                opened={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={
                    <Group gap="xs">
                        <TbTrash size={20} color="var(--mantine-color-red-6)" />
                        <Text fw={600}>ยืนยันการยกเลิกคำขอ</Text>
                    </Group>
                }
                centered
                size="sm"
            >
                {deleteTarget && (
                    <Stack gap="md">
                        <Paper p="md" withBorder bg="gray.0">
                            <Stack gap="xs">
                                <Text size="sm">พนักงาน: <strong>{deleteTarget.employee_name}</strong></Text>
                                <Text size="sm">จำนวนเงิน: <strong>฿{formatCurrency(deleteTarget.amount)}</strong></Text>
                            </Stack>
                        </Paper>

                        <Text size="sm" c="dimmed">
                            คุณต้องการยกเลิกคำขอเบิกเงินเดือนนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </Text>

                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => setDeleteTarget(null)}>
                                ปิด
                            </Button>
                            <Button
                                color="red"
                                onClick={handleDelete}
                                loading={deleteLoading}
                                leftSection={<TbTrash size={16} />}
                            >
                                ยืนยันยกเลิก
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Stack>
    )
}
