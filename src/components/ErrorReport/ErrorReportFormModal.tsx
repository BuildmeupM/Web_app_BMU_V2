/**
 * ErrorReportFormModal — Create/Edit error report modal
 */

import { useMemo, useState } from 'react'
import {
    Modal, Stack, SimpleGrid, Text, Group, Button, Divider,
    Select, MultiSelect, TextInput, NumberInput, Paper, Badge,
    Combobox, InputBase, useCombobox,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { TbAlertTriangle, TbSend, TbPlus, TbMapPin } from 'react-icons/tb'
import type { ErrorReportForm, AuditorOption, ClientOption } from '../../services/errorReportService'
import { ERROR_TYPE_OPTIONS, FAULT_PARTY_OPTIONS, MONTH_OPTIONS } from '../../services/errorReportService'
import type { MessengerLocation } from '../../services/messengerRouteService'
import { createLocation } from '../../services/messengerRouteService'
import { YEAR_OPTIONS } from './constants'

interface ErrorReportFormModalProps {
    opened: boolean
    onClose: () => void
    editingId: number | null
    form: ErrorReportForm
    setForm: React.Dispatch<React.SetStateAction<ErrorReportForm>>
    onSubmit: () => void
    submitting: boolean
    clients: ClientOption[]
    auditors: AuditorOption[]
    locations: MessengerLocation[]
    userName: string
    searchClients: (query: string) => void
    clientSearching: boolean
    onLocationsUpdate: (updater: (prev: MessengerLocation[]) => MessengerLocation[]) => void
}

export default function ErrorReportFormModal({
    opened,
    onClose,
    editingId,
    form,
    setForm,
    onSubmit,
    submitting,
    clients,
    auditors,
    locations,
    userName,
    searchClients,
    clientSearching,
    onLocationsUpdate,
}: ErrorReportFormModalProps) {
    // Local state for tax year and address search
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
    const [addressSearch, setAddressSearch] = useState('')

    const addressCombobox = useCombobox({
        onDropdownClose: () => addressCombobox.resetSelectedOption(),
    })

    // Client select options
    const clientOptions = useMemo(() =>
        clients.map(c => ({ value: String(c.id), label: c.name })),
        [clients]
    )

    // Auditor select options
    const auditorOptions = useMemo(() =>
        auditors.map(a => ({ value: String(a.id), label: a.name })),
        [auditors]
    )

    // Tax month multi-select options (for selected year)
    const taxMonthOptions = useMemo(() =>
        MONTH_OPTIONS.map(m => ({
            value: `${selectedYear}-${m.value}`,
            label: `${m.label} ${Number(selectedYear) + 543}`,
        })),
        [selectedYear]
    )

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbAlertTriangle size={20} color="#f97316" />
                    <Text fw={700}>{editingId ? 'แก้ไขรายงาน' : 'สร้างรายงานข้อผิดพลาด'}</Text>
                </Group>
            }
            size="lg"
            centered
        >
            <Stack gap="md">
                {/* Row 1: Date + Client */}
                <SimpleGrid cols={2}>
                    <DateInput
                        label="วันที่แจ้ง"
                        value={form.report_date ? new Date(form.report_date) : null}
                        onChange={(val) => setForm(f => ({ ...f, report_date: val ? val.toISOString().slice(0, 10) : '' }))}
                        valueFormat="DD/MM/YYYY"
                        required
                    />
                    <Select
                        label="บริษัท"
                        placeholder="พิมพ์ค้นหาบริษัท..."
                        data={clientOptions}
                        value={form.client_id ? String(form.client_id) : null}
                        onChange={(val) => {
                            const client = clients.find(c => String(c.id) === val)
                            setForm(f => ({
                                ...f,
                                client_id: val ? Number(val) : null,
                                client_name: client?.name || '',
                            }))
                        }}
                        onSearchChange={(query) => searchClients(query)}
                        searchable
                        required
                        nothingFoundMessage={clientSearching ? 'กำลังค้นหา...' : 'ไม่พบข้อมูล'}
                        filter={({ options }) => options}
                    />
                </SimpleGrid>

                {/* Error types (multi-select) */}
                <MultiSelect
                    label="หัวข้อผิดพลาด"
                    placeholder="เลือกรายการ"
                    data={ERROR_TYPE_OPTIONS}
                    value={form.error_types}
                    onChange={(val) => setForm(f => ({ ...f, error_types: val }))}
                    required
                />

                {/* Tax months: Year selector + Month multi-select */}
                <Paper withBorder radius="md" p="sm">
                    <Text size="sm" fw={600} mb="xs">เดือนภาษี <Text component="span" c="red">*</Text></Text>
                    <SimpleGrid cols={2}>
                        <Select
                            label="ปี"
                            data={YEAR_OPTIONS}
                            value={selectedYear}
                            onChange={(val) => setSelectedYear(val || String(new Date().getFullYear()))}
                        />
                        <MultiSelect
                            label="เดือน"
                            placeholder="เลือกเดือน"
                            data={taxMonthOptions}
                            value={form.tax_months}
                            onChange={(val) => setForm(f => ({ ...f, tax_months: val }))}
                        />
                    </SimpleGrid>
                </Paper>

                {/* Accountant (auto-filled) */}
                <TextInput
                    label="ผู้ทำบัญชี"
                    value={userName}
                    readOnly
                    variant="filled"
                />

                {/* Row: Auditor + Fault party */}
                <SimpleGrid cols={2}>
                    <Select
                        label="ผู้ตรวจภาษีประจำเดือน"
                        placeholder="เลือกผู้ตรวจ"
                        data={auditorOptions}
                        value={form.auditor_id ? String(form.auditor_id) : null}
                        onChange={(val) => {
                            const auditor = auditors.find(a => String(a.id) === val)
                            setForm(f => ({
                                ...f,
                                auditor_id: val || null,
                                auditor_name: auditor?.name || '',
                            }))
                        }}
                        searchable
                        clearable
                    />
                    <Select
                        label="ฝ่ายที่ทำให้เกิดข้อผิดพลาด"
                        placeholder="เลือก"
                        data={FAULT_PARTY_OPTIONS}
                        value={form.fault_party}
                        onChange={(val) => setForm(f => ({ ...f, fault_party: (val || '') as any }))}
                        required
                    />
                </SimpleGrid>

                {/* Fine amount */}
                <NumberInput
                    label="จำนวนค่าปรับ (บาท)"
                    placeholder="ระบุจำนวนเงิน"
                    value={form.fine_amount === 0 || form.fine_amount === '' ? '' : form.fine_amount}
                    onChange={(val) => setForm(f => ({ ...f, fine_amount: val === '' ? '' : Number(val) }))}
                    min={0}
                    thousandSeparator=","
                    suffix=" บาท"
                    hideControls
                    allowNegative={false}
                    onFocus={(e) => e.currentTarget.select()}
                    styles={{ input: { textAlign: 'right' } }}
                />

                {/* Submission address — searchable location dropdown */}
                <Combobox
                    store={addressCombobox}
                    onOptionSubmit={async (val) => {
                        if (val === '__create__') {
                            const name = (addressSearch || '').trim()
                            if (!name) return
                            try {
                                const newLoc = await createLocation({ name, category: 'อื่นๆ' })
                                onLocationsUpdate((prev) => [...prev, newLoc])
                                const addr = newLoc.name
                                setForm(f => ({ ...f, submission_address: addr }))
                                setAddressSearch(addr)
                                notifications.show({ title: 'เพิ่มสถานที่สำเร็จ', message: `เพิ่ม "${name}" แล้ว`, color: 'green' })
                            } catch {
                                notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถเพิ่มสถานที่ได้', color: 'red' })
                            }
                        } else {
                            const loc = locations.find(l => l.id === val)
                            if (loc) {
                                const addr = loc.address ? `${loc.name} — ${loc.address}` : loc.name
                                setForm(f => ({ ...f, submission_address: addr }))
                                setAddressSearch(addr)
                            }
                        }
                        addressCombobox.closeDropdown()
                    }}
                >
                    <Combobox.Target>
                        <InputBase
                            label="ข้อมูลที่อยู่ที่จะต้องยื่นปรับแบบ"
                            placeholder="พิมพ์ค้นหาหรือเลือกสถานที่..."
                            required
                            leftSection={<TbMapPin size={16} />}
                            rightSection={<Combobox.Chevron />}
                            rightSectionPointerEvents="none"
                            value={addressSearch || form.submission_address}
                            onChange={(e) => {
                                const val = e.currentTarget.value
                                setAddressSearch(val)
                                setForm(f => ({ ...f, submission_address: val }))
                                addressCombobox.openDropdown()
                                addressCombobox.updateSelectedOptionIndex()
                            }}
                            onClick={() => addressCombobox.openDropdown()}
                            onFocus={() => addressCombobox.openDropdown()}
                            onBlur={() => addressCombobox.closeDropdown()}
                        />
                    </Combobox.Target>
                    <Combobox.Dropdown>
                        <Combobox.Options mah={200} style={{ overflowY: 'auto' }}>
                            {locations
                                .filter(loc => {
                                    const q = (addressSearch || form.submission_address || '').toLowerCase().trim()
                                    if (!q) return true
                                    return loc.name.toLowerCase().includes(q) || (loc.address || '').toLowerCase().includes(q)
                                })
                                .slice(0, 10)
                                .map(loc => (
                                    <Combobox.Option value={loc.id} key={loc.id}>
                                        <Group gap="xs">
                                            <TbMapPin size={14} color="#666" />
                                            <div>
                                                <Text size="sm" fw={500}>{loc.name}</Text>
                                                {loc.address && <Text size="xs" c="dimmed">{loc.address}</Text>}
                                            </div>
                                            {loc.category && (
                                                <Badge size="xs" variant="light" color="gray" ml="auto">{loc.category}</Badge>
                                            )}
                                        </Group>
                                    </Combobox.Option>
                                ))}
                            {locations.filter(loc => {
                                const q = (addressSearch || form.submission_address || '').toLowerCase().trim()
                                if (!q) return true
                                return loc.name.toLowerCase().includes(q) || (loc.address || '').toLowerCase().includes(q)
                            }).length === 0 && (
                                    <Combobox.Empty>ไม่พบสถานที่</Combobox.Empty>
                                )}
                            {(addressSearch || '').trim() && !locations.some(loc => loc.name.toLowerCase() === (addressSearch || '').toLowerCase().trim()) && (
                                <Combobox.Option value="__create__" style={{ borderTop: '1px solid #eee' }}>
                                    <Group gap="xs">
                                        <TbPlus size={14} color="#228be6" />
                                        <Text size="sm" c="blue">เพิ่ม "{(addressSearch || '').trim()}" เป็นสถานที่ใหม่</Text>
                                    </Group>
                                </Combobox.Option>
                            )}
                        </Combobox.Options>
                    </Combobox.Dropdown>
                </Combobox>

                <Divider />

                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button
                        leftSection={<TbSend size={16} />}
                        onClick={onSubmit}
                        loading={submitting}
                        color="orange"
                    >
                        {editingId ? 'บันทึก' : 'ส่งรายงาน'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
