/**
 * DetailModal — View error report details
 */

import { Modal, Stack, SimpleGrid, Text, Badge, Group, Alert } from '@mantine/core'
import { ERROR_TYPE_OPTIONS } from '../../services/errorReportService'
import type { ErrorReport } from '../../services/errorReportService'
import { STATUS_CONFIG, getTaxMonthLabels } from './constants'

interface DetailModalProps {
    report: ErrorReport | null
    onClose: () => void
}

export default function DetailModal({ report, onClose }: DetailModalProps) {
    if (!report) return null

    const errorTypes = typeof report.error_types === 'string' ? JSON.parse(report.error_types) : report.error_types
    const taxMonths = typeof report.tax_months === 'string' ? JSON.parse(report.tax_months) : report.tax_months
    const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending

    return (
        <Modal
            opened={report !== null}
            onClose={onClose}
            title={<Text fw={700}>รายละเอียดรายงาน #{report.id}</Text>}
            size="lg"
            centered
        >
            <Stack gap="sm">
                <SimpleGrid cols={2}>
                    <div>
                        <Text size="xs" c="dimmed">วันที่แจ้ง</Text>
                        <Text size="sm" fw={500}>{report.report_date ? new Date(report.report_date).toLocaleDateString('th-TH') : '-'}</Text>
                    </div>
                    <div>
                        <Text size="xs" c="dimmed">สถานะ</Text>
                        <Badge color={statusCfg.color} variant="light">{statusCfg.label}</Badge>
                    </div>
                </SimpleGrid>

                <div>
                    <Text size="xs" c="dimmed">บริษัท</Text>
                    <Text size="sm" fw={500}>{report.client_name}</Text>
                </div>

                <div>
                    <Text size="xs" c="dimmed">หัวข้อผิดพลาด</Text>
                    <Group gap={4} mt={2}>
                        {(errorTypes || []).map((t: string) => {
                            const opt = ERROR_TYPE_OPTIONS.find(o => o.value === t)
                            return <Badge key={t} size="sm" variant="outline" color="orange">{opt?.label || t}</Badge>
                        })}
                    </Group>
                </div>

                <div>
                    <Text size="xs" c="dimmed">เดือนภาษี</Text>
                    <Text size="sm">{getTaxMonthLabels(taxMonths)}</Text>
                </div>

                <SimpleGrid cols={2}>
                    <div>
                        <Text size="xs" c="dimmed">ผู้ทำบัญชี</Text>
                        <Text size="sm">{report.accountant_name}</Text>
                    </div>
                    <div>
                        <Text size="xs" c="dimmed">ผู้ตรวจภาษี</Text>
                        <Text size="sm">{report.auditor_name || '-'}</Text>
                    </div>
                </SimpleGrid>

                <SimpleGrid cols={2}>
                    <div>
                        <Text size="xs" c="dimmed">ฝ่ายที่ทำให้เกิดข้อผิดพลาด</Text>
                        <Badge color={report.fault_party === 'bmu' ? 'orange' : 'blue'} variant="light">
                            {report.fault_party === 'bmu' ? 'พนักงาน BMU' : 'ลูกค้า'}
                        </Badge>
                    </div>
                    <div>
                        <Text size="xs" c="dimmed">ค่าปรับ</Text>
                        <Text size="sm" fw={600} c={report.fine_amount > 0 ? 'red' : 'dimmed'}>
                            {report.fine_amount > 0 ? `${Number(report.fine_amount).toLocaleString()} บาท` : 'ไม่มี'}
                        </Text>
                    </div>
                </SimpleGrid>

                {report.submission_address && (
                    <div>
                        <Text size="xs" c="dimmed">ที่อยู่ยื่นปรับแบบ</Text>
                        <Text size="sm">{report.submission_address}</Text>
                    </div>
                )}

                {report.status === 'approved' && (
                    <Alert color="green" variant="light" title="อนุมัติแล้ว">
                        <Text size="sm">
                            อนุมัติโดย: {report.approved_by_name} |
                            เมื่อ: {report.approved_at ? new Date(report.approved_at).toLocaleString('th-TH') : '-'}
                        </Text>
                        {report.messenger_task_id && (
                            <Text size="xs" c="dimmed" mt={4}>
                                Messenger Task ID: {report.messenger_task_id}
                            </Text>
                        )}
                    </Alert>
                )}

                {report.status === 'rejected' && (
                    <Alert color="red" variant="light" title="ไม่อนุมัติ">
                        <Text size="sm">
                            โดย: {report.approved_by_name} |
                            เมื่อ: {report.approved_at ? new Date(report.approved_at).toLocaleString('th-TH') : '-'}
                        </Text>
                        <Text size="sm" fw={600} mt={4}>
                            เหตุผล: {report.reject_reason}
                        </Text>
                    </Alert>
                )}
            </Stack>
        </Modal>
    )
}
