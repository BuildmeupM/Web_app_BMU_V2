/**
 * Document Request List
 * ตารางรายการคำขอเอกสาร พร้อมปุ่มอนุมัติ/ไม่อนุมัติ/ออกเอกสาร (Admin/HR)
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
    TbFileDescription,
    TbPrinter,
    TbTrash,
} from 'react-icons/tb'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '../../store/authStore'
import { documentRequestService, DocumentRequest } from '../../services/documentRequestService'

interface DocumentRequestListProps {
    pendingOnly?: boolean
    refreshTrigger?: number
}

export default function DocumentRequestList({ pendingOnly = false, refreshTrigger = 0 }: DocumentRequestListProps) {
    const [requests, setRequests] = useState<DocumentRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [actionModal, setActionModal] = useState<{
        type: 'approve' | 'reject'
        request: DocumentRequest
    } | null>(null)
    const [actionNote, setActionNote] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<DocumentRequest | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const user = useAuthStore((state) => state.user)
    const isAdmin = user?.role === 'admin' || user?.role === 'hr'

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true)
            let response
            if (pendingOnly) {
                response = await documentRequestService.getPending({ page, limit: 20 })
            } else {
                response = await documentRequestService.getAll({
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
            console.error('Failed to fetch document requests:', error)
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
                await documentRequestService.approve(actionModal.request.id, {
                    approver_note: actionNote || undefined,
                })
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'อนุมัติคำขอเอกสารเรียบร้อยแล้ว',
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
                await documentRequestService.reject(actionModal.request.id, {
                    approver_note: actionNote,
                })
                notifications.show({
                    title: 'สำเร็จ',
                    message: 'ปฏิเสธคำขอเอกสารเรียบร้อยแล้ว',
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
            await documentRequestService.delete(deleteTarget.id)
            notifications.show({
                title: 'สำเร็จ',
                message: 'ยกเลิกคำขอเอกสารเรียบร้อยแล้ว',
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

    const handleIssue = async (request: DocumentRequest) => {
        try {
            await documentRequestService.issue(request.id)
            notifications.show({
                title: 'สำเร็จ',
                message: 'บันทึกการออกเอกสารเรียบร้อยแล้ว',
                color: 'green',
            })
            fetchRequests()
        } catch (err: any) {
            const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด'
            notifications.show({ title: 'ข้อผิดพลาด', message: msg, color: 'red' })
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
            case 'ออกเอกสารแล้ว':
                return <Badge color="blue" variant="light">ออกเอกสารแล้ว</Badge>
            default:
                return <Badge variant="light">{status}</Badge>
        }
    }

    const getDocTypeBadge = (type: string) => {
        switch (type) {
            case 'หนังสือรับรองการทำงาน':
                return <Badge color="teal" variant="dot">รับรองการทำงาน</Badge>
            case 'หนังสือรับรองเงินเดือน':
                return <Badge color="indigo" variant="dot">รับรองเงินเดือน</Badge>
            default:
                return <Badge variant="dot">{type}</Badge>
        }
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
                            <TbFileDescription size={48} color="var(--mantine-color-gray-4)" />
                            <Text c="dimmed" size="lg">
                                {pendingOnly ? 'ไม่มีคำขอที่รออนุมัติ' : 'ยังไม่มีการขอเอกสาร'}
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
                                <Table.Th>ประเภทเอกสาร</Table.Th>
                                <Table.Th ta="center">จำนวน</Table.Th>
                                <Table.Th ta="center">สถานะ</Table.Th>
                                <Table.Th>วัตถุประสงค์</Table.Th>
                                <Table.Th ta="center">จัดการ</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {requests.map((req) => (
                                <Table.Tr key={req.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <Avatar size="sm" radius="xl" color="violet">
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
                                    <Table.Td>{getDocTypeBadge(req.document_type)}</Table.Td>
                                    <Table.Td ta="center">
                                        <Badge variant="light" color="gray">{req.copies} ฉบับ</Badge>
                                    </Table.Td>
                                    <Table.Td ta="center">{getStatusBadge(req.status)}</Table.Td>
                                    <Table.Td>
                                        {req.purpose ? (
                                            <Tooltip label={req.purpose} multiline w={250}>
                                                <Text size="sm" lineClamp={1} maw={200}>{req.purpose}</Text>
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
                                        ) : req.status === 'อนุมัติแล้ว' && isAdmin ? (
                                            <Button
                                                size="xs"
                                                color="blue"
                                                variant="light"
                                                leftSection={<TbPrinter size={14} />}
                                                onClick={() => handleIssue(req)}
                                            >
                                                ออกเอกสาร
                                            </Button>
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
                            {actionModal?.type === 'approve' ? 'อนุมัติคำขอเอกสาร' : 'ไม่อนุมัติคำขอเอกสาร'}
                        </Text>
                    </Group>
                }
                centered
                size="md"
            >
                {actionModal && (
                    <Stack gap="md">
                        <Paper p="md" withBorder bg="gray.0">
                            <Stack gap="xs">
                                <Text size="sm">พนักงาน: <strong>{actionModal.request.employee_name}</strong></Text>
                                <Text size="sm">เอกสาร: <strong>{actionModal.request.document_type}</strong></Text>
                                <Text size="sm">จำนวน: <strong>{actionModal.request.copies} ฉบับ</strong></Text>
                            </Stack>
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
                                <Text size="sm">เอกสาร: <strong>{deleteTarget.document_type}</strong></Text>
                                <Text size="sm">จำนวน: <strong>{deleteTarget.copies} ฉบับ</strong></Text>
                            </Stack>
                        </Paper>

                        <Text size="sm" c="dimmed">
                            คุณต้องการยกเลิกคำขอเอกสารนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
