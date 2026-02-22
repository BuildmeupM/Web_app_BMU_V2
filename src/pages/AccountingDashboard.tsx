/**
 * AccountingDashboard — Dashboard งานบัญชี
 * แสดงข้อมูลสรุปภาษีรายเดือนแบบ real-time 4 มุมมอง:
 *   Tab 1: Service (ผู้ทำบัญชี)
 *   Tab 2: Audit (ผู้ตรวจภาษี)
 *   Tab 3: Send Tax (พนักงานยื่นภาษี)
 *   Tab 4: Data Entry (คีย์เอกสาร)
 *
 * Sub-components extracted to src/components/AccountingDashboard/
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Box,
    Text,
    Group,
    Stack,
    Select,
    ActionIcon,
    Tooltip,
    Loader,
    Center,
    Badge,
    Switch,
    Alert,
} from '@mantine/core'
import { TbRefresh, TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import monthlyTaxDataService from '../services/monthlyTaxDataService'
import documentEntryWorkService from '../services/documentEntryWorkService'
import { employeeService } from '../services/employeeService'
import { getCurrentTaxMonth } from '../utils/taxMonthUtils'
import {
    THAI_MONTHS,
    TAB_CONFIG,
} from '../components/AccountingDashboard/constants'
import type { TabKey } from '../components/AccountingDashboard/constants'
import ServiceTab from '../components/AccountingDashboard/ServiceTab'
import AuditTab from '../components/AccountingDashboard/AuditTab'
import SendTaxTab from '../components/AccountingDashboard/SendTaxTab'
import DataEntryTab from '../components/AccountingDashboard/DataEntryTab'
import './AccountingDashboard.css'

// ═══════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════

export default function AccountingDashboard() {
    const { year: defaultYear, month: defaultMonth } = getCurrentTaxMonth()
    const [selectedYear, setSelectedYear] = useState(String(defaultYear))
    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonth))
    const [activeTab, setActiveTab] = useState<TabKey>('service')
    const [autoRefresh, setAutoRefresh] = useState(false)

    // Year options — current year ± 2
    const yearOptions = useMemo(() => {
        const now = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => {
            const y = now - 2 + i
            return { value: String(y), label: `${y + 543}` } // แสดงเป็น พ.ศ.
        })
    }, [])

    // Month options
    const monthOptions = useMemo(() =>
        THAI_MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
        []
    )

    // Fetch data
    const { data: listData, isLoading, isError, error, refetch } = useQuery(
        ['accounting-dashboard', selectedYear, selectedMonth],
        () => monthlyTaxDataService.getList({
            year: selectedYear,
            month: selectedMonth,
            limit: 9999,
        }),
        {
            staleTime: 60_000,
            cacheTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount: number, err: any) => {
                if (err?.response?.status >= 400 && err?.response?.status < 500) return false
                return failureCount < 2
            },
        }
    )

    const records = listData?.data || []

    // Fetch document entry work data (for Data Entry tab)
    const { data: entryListData } = useQuery(
        ['document-entry-work-dashboard', selectedYear, selectedMonth],
        () => documentEntryWorkService.getList({
            year: Number(selectedYear),
            month: Number(selectedMonth),
            limit: 9999,
        }),
        {
            staleTime: 60_000,
            cacheTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            enabled: activeTab === 'dataEntry',
        }
    )
    const entryRecords = entryListData?.data || []

    // Fetch employee list for name mapping
    const { data: employeeListData } = useQuery(
        ['employees-name-map'],
        () => employeeService.getAll({ limit: 9999, status: 'active' }),
        {
            staleTime: 10 * 60_000,
            cacheTime: 30 * 60_000,
            refetchOnWindowFocus: false,
        }
    )
    const employeeNameMap = useMemo(() => {
        const map = new Map<string, string>()
        if (employeeListData?.employees) {
            employeeListData.employees.forEach(emp => {
                const displayName = emp.nick_name
                    ? `${emp.first_name}(${emp.nick_name})`
                    : emp.first_name
                map.set(emp.employee_id, displayName)
            })
        }
        return map
    }, [employeeListData])

    // Auto-refresh interval
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => refetch(), 30_000)
        return () => clearInterval(interval)
    }, [autoRefresh, refetch])

    const handleRefresh = useCallback(() => refetch(), [refetch])

    // ────────────────────────────────────────────
    //  Render
    // ────────────────────────────────────────────

    return (
        <Box p="md" className="acct-dashboard">
            {/* Header */}
            <div className="acct-header acct-animate acct-animate-1">
                <Group justify="space-between" wrap="wrap" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Tabs */}
                    <Group gap={6}>
                        {TAB_CONFIG.map(tab => (
                            <div
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`acct-tab-pill ${activeTab === tab.key ? 'acct-tab-pill--active' : ''}`}
                            >
                                <Text
                                    size="sm"
                                    fw={activeTab === tab.key ? 700 : 500}
                                    c={activeTab === tab.key ? '#ff6b35' : 'white'}
                                >
                                    {tab.label}
                                </Text>
                            </div>
                        ))}
                    </Group>

                    {/* Filters */}
                    <Group gap="sm" className="acct-filter-group">
                        <Select
                            size="xs"
                            w={120}
                            value={selectedMonth}
                            onChange={(v) => v && setSelectedMonth(v)}
                            data={monthOptions}
                            styles={{
                                input: { background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8 },
                                option: { '&[data-selected]': { background: '#ff6b35' } },
                            }}
                        />
                        <Select
                            size="xs"
                            w={90}
                            value={selectedYear}
                            onChange={(v) => v && setSelectedYear(v)}
                            data={yearOptions}
                            styles={{
                                input: { background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8 },
                                option: { '&[data-selected]': { background: '#ff6b35' } },
                            }}
                        />
                        <Tooltip label="รีเฟรช">
                            <ActionIcon
                                variant="subtle"
                                color="white"
                                onClick={handleRefresh}
                                loading={isLoading}
                            >
                                <TbRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Switch
                            size="xs"
                            label={<Text size="xs" c="white">Auto</Text>}
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                            color="orange"
                        />
                    </Group>
                </Group>

                {/* Summary info */}
                <Group gap="lg" mt="sm" style={{ position: 'relative', zIndex: 1 }}>
                    <Badge size="sm" variant="filled" color="rgba(255,255,255,0.25)" style={{ color: 'white' }}>
                        📅 {THAI_MONTHS[parseInt(selectedMonth) - 1]} {parseInt(selectedYear) + 543}
                    </Badge>
                    <Text size="xs" c="white" style={{ opacity: 0.9 }}>
                        ข้อมูลทั้งหมด: {records.length} บริษัท
                    </Text>
                    {autoRefresh && (
                        <Text size="xs" c="white" style={{ opacity: 0.8 }}>
                            🔄 รีเฟรชอัตโนมัติทุก 30 วินาที
                        </Text>
                    )}
                </Group>
            </div>

            {/* Content */}
            {isLoading ? (
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" color="orange" />
                        <Text c="gray.6" size="sm">กำลังโหลดข้อมูล...</Text>
                    </Stack>
                </Center>
            ) : isError ? (
                <Alert icon={<TbAlertCircle />} title="เกิดข้อผิดพลาด" color="red" radius="lg">
                    {(error as any)?.message || 'ไม่สามารถโหลดข้อมูลได้'}
                </Alert>
            ) : records.length === 0 ? (
                <Center h={300}>
                    <Stack align="center" gap="md">
                        <Text size="xl">📊</Text>
                        <Text c="gray.6" size="sm">ไม่พบข้อมูลสำหรับเดือนนี้</Text>
                    </Stack>
                </Center>
            ) : (
                <>
                    {activeTab === 'service' && <ServiceTab data={records} />}
                    {activeTab === 'audit' && <AuditTab data={records} employeeNameMap={employeeNameMap} year={Number(selectedYear)} month={Number(selectedMonth)} />}
                    {activeTab === 'sendTax' && <SendTaxTab data={records} />}
                    {activeTab === 'dataEntry' && <DataEntryTab data={records} entryData={entryRecords} employeeNameMap={employeeNameMap} />}
                </>
            )}
        </Box>
    )
}
