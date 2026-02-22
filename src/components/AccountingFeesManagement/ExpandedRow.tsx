import {
    Stack,
    Group,
    Text,
    Badge,
    Button,
    ActionIcon,
    Tooltip,
    Box,
    SimpleGrid,
    Divider,
    CopyButton,
    Paper,
} from '@mantine/core'
import {
    TbEdit,
    TbCheck,
    TbUsers,
    TbCurrencyBaht,
    TbExternalLink,
    TbPhoto,
    TbCopy,
    TbMapPin,
    TbMessage,
    TbReceipt,
} from 'react-icons/tb'
import { AccountingFees } from '../../services/clientsService'
import { MONTHS_TH, formatCurrency, getMonthlyFee, sumFees } from './constants'
import MonthCard from './MonthCard'

export default function ExpandedRow({
    fees,
    monthCount,
    canEdit,
    onEdit,
}: {
    fees: AccountingFees | null
    monthCount: number
    canEdit: boolean
    onEdit: () => void
}) {
    const months = MONTHS_TH.slice(0, monthCount)
    const totalAccounting = sumFees(fees, 'accounting_fee', monthCount)
    const totalHR = sumFees(fees, 'hr_fee', monthCount)

    if (!fees) {
        return (
            <Box p="md" style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
                <Group justify="space-between" align="center">
                    <Text c="dimmed" fs="italic" size="sm">ยังไม่มีข้อมูลค่าทำบัญชี</Text>
                    {canEdit && (
                        <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<TbEdit size={14} />}
                            onClick={onEdit}
                        >
                            เพิ่มข้อมูล
                        </Button>
                    )}
                </Group>
            </Box>
        )
    }

    return (
        <Box p="md" style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
            <Stack gap="md">
                {/* ค่าทำบัญชี */}
                <div>
                    <Group justify="space-between" mb={8}>
                        <Group gap={6}>
                            <TbCurrencyBaht size={16} color="#ff6b35" />
                            <Text size="sm" fw={600} c="#ff6b35">ค่าทำบัญชีรายเดือน</Text>
                            {fees?.fee_year && (
                                <Badge size="xs" variant="light" color="gray">ปี {fees.fee_year}</Badge>
                            )}
                        </Group>
                        <Badge variant="light" color="orange" size="sm">
                            รวม {formatCurrency(totalAccounting)} บาท
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 6, md: monthCount <= 6 ? monthCount : 6, lg: monthCount }}>
                        {months.map((m) => (
                            <MonthCard
                                key={`acc-${m.key}`}
                                label={m.label}
                                value={getMonthlyFee(fees, 'accounting_fee', m.key)}
                            />
                        ))}
                    </SimpleGrid>
                </div>

                <Divider variant="dashed" />

                {/* ค่า HR */}
                <div>
                    <Group justify="space-between" mb={8}>
                        <Group gap={6}>
                            <TbUsers size={16} color="#1976d2" />
                            <Text size="sm" fw={600} c="#1976d2">ค่าบริการ HR รายเดือน</Text>
                        </Group>
                        <Badge variant="light" color="blue" size="sm">
                            รวม {formatCurrency(totalHR)} บาท
                        </Badge>
                    </Group>
                    <SimpleGrid cols={{ base: 4, xs: 6, sm: 6, md: monthCount <= 6 ? monthCount : 6, lg: monthCount }}>
                        {months.map((m) => (
                            <MonthCard
                                key={`hr-${m.key}`}
                                label={m.label}
                                value={getMonthlyFee(fees, 'hr_fee', m.key)}
                            />
                        ))}
                    </SimpleGrid>
                </div>

                {/* Footer: Info Cards Grid */}
                <Divider variant="dashed" />
                <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                    {/* Peak Code Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbMapPin size={14} color="#ff6b35" />
                            <Text size="xs" fw={600} c="dimmed">Peak Code</Text>
                        </Group>
                        <Text size="sm" fw={700} c="dark">
                            {fees.peak_code || <Text span fs="italic" c="dimmed">-</Text>}
                        </Text>
                    </Paper>

                    {/* Line Chat Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbMessage size={14} color="#06c755" />
                            <Text size="xs" fw={600} c="dimmed">Line Chat</Text>
                            {fees.line_chat_type && (
                                <Badge size="xs" variant="light" color={fees.line_chat_type === 'group' ? 'green' : 'teal'}>
                                    {fees.line_chat_type}
                                </Badge>
                            )}
                        </Group>
                        {fees.line_chat_id ? (
                            <Group gap={4}>
                                <Tooltip label={fees.line_chat_id} multiline maw={300}>
                                    <Text size="xs" ff="monospace" c="dark" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                        {fees.line_chat_id}
                                    </Text>
                                </Tooltip>
                                <CopyButton value={fees.line_chat_id}>
                                    {({ copied, copy }) => (
                                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            {copied ? <TbCheck size={12} /> : <TbCopy size={12} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        ) : (
                            <Text size="xs" c="dimmed" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>

                    {/* Billing Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: '#e0e0e0' }}>
                        <Group gap={8} mb={4}>
                            <TbReceipt size={14} color="#2196f3" />
                            <Text size="xs" fw={600} c="dimmed">Line Billing</Text>
                            {fees.line_billing_chat_type && (
                                <Badge size="xs" variant="light" color={fees.line_billing_chat_type === 'group' ? 'green' : 'teal'}>
                                    {fees.line_billing_chat_type}
                                </Badge>
                            )}
                        </Group>
                        {fees.line_billing_id ? (
                            <Group gap={4}>
                                <Tooltip label={fees.line_billing_id} multiline maw={300}>
                                    <Text size="xs" ff="monospace" c="dark" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                        {fees.line_billing_id}
                                    </Text>
                                </Tooltip>
                                <CopyButton value={fees.line_billing_id}>
                                    {({ copied, copy }) => (
                                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                            {copied ? <TbCheck size={12} /> : <TbCopy size={12} />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        ) : (
                            <Text size="xs" c="dimmed" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>

                    {/* Image Link Card */}
                    <Paper withBorder radius="md" p="xs" style={{ borderColor: fees.accounting_fee_image_url ? '#4caf50' : '#ef5350', borderWidth: 1.5 }}>
                        <Group gap={8} mb={4}>
                            <TbPhoto size={14} color={fees.accounting_fee_image_url ? '#4caf50' : '#ef5350'} />
                            <Text size="xs" fw={600} c="dimmed">รูปค่าทำบัญชี</Text>
                        </Group>
                        {fees.accounting_fee_image_url ? (
                            <Button
                                size="xs"
                                variant="light"
                                color="green"
                                fullWidth
                                leftSection={<TbExternalLink size={14} />}
                                onClick={() => window.open(fees.accounting_fee_image_url!, '_blank')}
                            >
                                ดูรูปค่าทำบัญชี
                            </Button>
                        ) : (
                            <Text size="xs" c="red" fs="italic">ไม่มีข้อมูล</Text>
                        )}
                    </Paper>
                </SimpleGrid>

                {/* Edit Button */}
                {canEdit && (
                    <Group justify="flex-end">
                        <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            leftSection={<TbEdit size={14} />}
                            onClick={onEdit}
                        >
                            แก้ไข
                        </Button>
                    </Group>
                )}
            </Stack>
        </Box>
    )
}
