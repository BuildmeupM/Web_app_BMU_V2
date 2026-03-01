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
        <Box p="xl" className="acct-dashboard" style={{ background: '#fafbfc', minHeight: '100vh', padding: '32px' }}>
            {/* Header - Premium Minimal White/Orange */}
            <div className="acct-header acct-animate acct-animate-1" style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px 32px',
                boxShadow: '0 8px 30px rgba(255,107,53,0.06)',
                border: '1px solid rgba(255,107,53,0.1)',
                marginBottom: '24px'
            }}>
                <Group justify="space-between" wrap="wrap" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Tabs (Hierarchy focus) */}
                    <Group gap={8}>
                        {TAB_CONFIG.map(tab => (
                            <div
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    background: activeTab === tab.key ? 'linear-gradient(135deg, #FF8C42, #FF6B35)' : '#f4f5f7',
                                    boxShadow: activeTab === tab.key ? '0 4px 15px rgba(255,107,53,0.2)' : 'none',
                                    color: activeTab === tab.key ? '#fff' : '#666',
                                    fontWeight: activeTab === tab.key ? 700 : 500,
                                }}
                            >
                                <Text size="sm">{tab.label}</Text>
                            </div>
                        ))}
                    </Group>

                    {/* Filters & Actions */}
                    <Group gap="md">
                        <Select
                            size="md"
                            radius="md"
                            w={140}
                            value={selectedMonth}
                            onChange={(v) => v && setSelectedMonth(v)}
                            data={monthOptions}
                            styles={{
                                input: {
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    borderColor: '#eaeaea',
                                    background: '#fafbfc',
                                    transition: 'border-color 0.2s',
                                    '&:focus': { borderColor: '#FF8C42' }
                                }
                            }}
                        />
                        <Select
                            size="md"
                            radius="md"
                            w={110}
                            value={selectedYear}
                            onChange={(v) => v && setSelectedYear(v)}
                            data={yearOptions}
                            styles={{
                                input: {
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    borderColor: '#eaeaea',
                                    background: '#fafbfc',
                                    transition: 'border-color 0.2s',
                                    '&:focus': { borderColor: '#FF8C42' }
                                }
                            }}
                        />
                        
                        {/* Action Container */}
                        <Group gap={8} style={{ background: '#f8f9fa', padding: '4px 12px', borderRadius: '12px' }}>
                            <Tooltip label="รีเฟรชข้อมูล">
                                <ActionIcon
                                    variant="subtle"
                                    color="orange"
                                    size="lg"
                                    radius="md"
                                    onClick={handleRefresh}
                                    loading={isLoading}
                                    style={{ transition: 'transform 0.2s', '&:hover': { transform: 'rotate(180deg)' } } as any}
                                >
                                    <TbRefresh size={22} />
                                </ActionIcon>
                            </Tooltip>
                            
                            <Switch
                                size="sm"
                                label={<Text size="sm" fw={600} c="dimmed">Auto</Text>}
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                                color="orange"
                                style={{ marginLeft: '4px' }}
                            />
                        </Group>
                    </Group>
                </Group>

                {/* Summary / Context Information */}
                <Group gap="xl" mt="xl" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '6px', background: 'rgba(255,107,53,0.1)', borderRadius: '8px' }}>
                            <Text size="sm">📊</Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>รอบบิลบัญชี</Text>
                            <Text size="md" fw={700} c="#333">
                                {THAI_MONTHS[parseInt(selectedMonth) - 1]} {parseInt(selectedYear) + 543}
                            </Text>
                        </div>
                    </div>
                    
                    <div style={{ width: '1px', height: '30px', background: '#eaeaea' }} />
                    
                    <div>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>จำนวนลูกค้าทั้งหมด</Text>
                        <Text size="md" fw={700} c="#FF6B35">{records.length} บริษัท</Text>
                    </div>

                    {autoRefresh && (
                        <>
                            <div style={{ width: '1px', height: '30px', background: '#eaeaea' }} />
                            <Badge size="md" variant="light" color="orange" radius="sm">
                                🔄 30s Auto-sync Active
                            </Badge>
                        </>
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
