/**
 * CreateRouteModal — Create new route form modal with stop management & pending task import
 */

import {
    Box, Card, Text, Group, Stack, SimpleGrid, Badge, Modal,
    Button, ActionIcon, Checkbox, Divider, TextInput,
    Textarea, NumberInput, Progress,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import {
    TbPlus, TbCheck, TbCurrentLocation, TbClipboardList,
    TbRoute, TbClock, TbNotes, TbArrowUp, TbArrowDown,
    TbTrash, TbCalculator,
} from 'react-icons/tb'
import type { MessengerPendingTask, MessengerLocation } from '../../services/messengerRouteService'
import type { FormStop } from './constants'
import LocationSelect from './LocationSelect'

interface CreateRouteModalProps {
    opened: boolean
    onClose: () => void
    // Form state
    formDate: Date | null
    setFormDate: (v: Date | null) => void
    formNotes: string
    setFormNotes: (v: string) => void
    formStops: FormStop[]
    formTotalDistance: number
    // Start location
    startLocation: string
    startLat: number | null
    startLng: number | null
    handleStartLocationChange: (name: string, loc?: MessengerLocation) => void
    // Locations
    locations: MessengerLocation[]
    handleCreateNewLocation: (name: string, isStart: boolean, stopIndex?: number) => void
    // Stop actions
    addFormStop: () => void
    removeFormStop: (index: number) => void
    moveFormStop: (index: number, direction: 'up' | 'down') => void
    updateFormStop: (index: number, field: string, value: unknown) => void
    handleStopLocationChange: (index: number, name: string, loc?: MessengerLocation) => void
    // Pending tasks import
    pendingTasks: MessengerPendingTask[]
    selectedTaskIds: string[]
    toggleTaskSelection: (id: string) => void
    toggleAllTasks: () => void
    importPendingTasks: () => void
    importingTasks: boolean
    // Auto-calc
    geocodedCount: number
    autoCalcAllDistances: () => void
    calcInProgress: boolean
    // Submit
    handleCreate: () => void
    creating: boolean
}

const deptColors: Record<string, string> = { dbd: 'violet', rd: 'green', sso: 'blue', hr: 'red' }

export default function CreateRouteModal({
    opened, onClose,
    formDate, setFormDate,
    formNotes, setFormNotes,
    formStops, formTotalDistance,
    startLocation, startLat, startLng,
    handleStartLocationChange,
    locations, handleCreateNewLocation,
    addFormStop, removeFormStop, moveFormStop,
    updateFormStop, handleStopLocationChange,
    pendingTasks, selectedTaskIds,
    toggleTaskSelection, toggleAllTasks,
    importPendingTasks, importingTasks,
    geocodedCount, autoCalcAllDistances, calcInProgress,
    handleCreate, creating,
}: CreateRouteModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group gap="sm"><TbPlus size={20} /><Text fw={700} size="lg">สร้างตารางวิ่ง</Text></Group>}
            size="lg" radius="lg"
        >
            <Stack gap="md">
                <SimpleGrid cols={2}>
                    <DateInput
                        label="วันที่วิ่ง" value={formDate} onChange={setFormDate}
                        required valueFormat="DD/MM/YYYY"
                    />
                    <Box>
                        <Text size="sm" fw={500} mb={4}>ระยะทางรวม</Text>
                        <Text size="lg" fw={700} c="orange">{formTotalDistance.toFixed(1)} km</Text>
                    </Box>
                </SimpleGrid>

                {/* ===== จุดเริ่มต้น ===== */}
                <Divider
                    label={<Group gap={6}><TbCurrentLocation size={16} /><Text size="sm" fw={600}>จุดเริ่มต้น</Text></Group>}
                    labelPosition="center"
                />

                <Card withBorder radius="md" p="sm" style={{ backgroundColor: '#e8f5e9', borderColor: '#66bb6a' }}>
                    <LocationSelect
                        locations={locations}
                        value={startLocation}
                        onChange={handleStartLocationChange}
                        onCreateNew={(name) => handleCreateNewLocation(name, true)}
                        label="สถานที่เริ่มต้น"
                        placeholder="พิมพ์ค้นหาหรือเลือกจากรายการ..."
                    />
                    {startLat && startLng && (
                        <Text size="xs" c="dimmed" mt={4}>
                            ✅ พิกัด: {startLat.toFixed(5)}, {startLng.toFixed(5)}
                        </Text>
                    )}
                    {startLocation && !startLat && (
                        <Text size="xs" c="orange" mt={4}>
                            ⚠️ ยังไม่มีพิกัด — เลือกจากรายการที่มีเครื่องหมาย 📍
                        </Text>
                    )}
                </Card>

                <Textarea
                    label="หมายเหตุรวม" placeholder="หมายเหตุสำหรับทริปนี้..."
                    value={formNotes} onChange={(e) => setFormNotes(e.currentTarget.value)}
                    autosize minRows={2}
                />

                {/* ===== นำเข้าจากรอวิ่งแมส ===== */}
                {pendingTasks.length > 0 && (
                    <>
                        <Divider
                            label={<Group gap={6}><TbClipboardList size={16} /><Text size="sm" fw={600}>นำเข้าจากรอวิ่งแมส ({pendingTasks.length} งาน)</Text></Group>}
                            labelPosition="center"
                        />
                        <Card withBorder radius="md" p="sm" style={{ backgroundColor: '#fff8e1', borderColor: '#ffb74d', maxHeight: 260, overflowY: 'auto' }}>
                            <Group justify="space-between" mb="xs">
                                <Checkbox
                                    label={<Text size="xs" fw={600}>เลือกทั้งหมด</Text>}
                                    checked={selectedTaskIds.length === pendingTasks.length && pendingTasks.length > 0}
                                    indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < pendingTasks.length}
                                    onChange={toggleAllTasks}
                                    size="xs"
                                />
                                <Button
                                    size="xs" variant="light" color="orange"
                                    leftSection={<TbClipboardList size={14} />}
                                    disabled={selectedTaskIds.length === 0}
                                    loading={importingTasks}
                                    onClick={importPendingTasks}
                                >
                                    {importingTasks ? 'กำลังค้นหาพิกัด...' : `นำเข้า ${selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}`}
                                </Button>
                            </Group>
                            <Stack gap={4}>
                                {pendingTasks.map(task => (
                                    <Card key={task.id} withBorder radius="sm" p="xs"
                                        style={{
                                            backgroundColor: selectedTaskIds.includes(task.id) ? '#e3f2fd' : '#fff',
                                            borderColor: selectedTaskIds.includes(task.id) ? '#42a5f5' : '#e0e0e0',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => toggleTaskSelection(task.id)}
                                    >
                                        <Group gap="xs" wrap="nowrap">
                                            <Checkbox
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={() => toggleTaskSelection(task.id)}
                                                size="xs"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={6} wrap="nowrap">
                                                    <Text size="sm" fw={600} truncate>{task.client_name}</Text>
                                                    <Badge size="xs" variant="light" color={deptColors[task.department] || 'gray'}>
                                                        {task.department?.toUpperCase()}
                                                    </Badge>
                                                </Group>
                                                <Text size="xs" c="dimmed" truncate>
                                                    📍 {task.messenger_destination || task.client_address || 'ไม่ระบุ'}
                                                </Text>
                                                {task.messenger_details && (
                                                    <Text size="xs" c="dimmed" truncate>📋 {task.messenger_details}</Text>
                                                )}
                                            </div>
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        </Card>
                    </>
                )}

                {/* ===== จุดแวะ ===== */}
                <Divider label={`จุดแวะ (${formStops.length})`} labelPosition="center" />

                {formStops.map((stop, index) => (
                    <Card key={index} withBorder radius="md" p="sm" style={{ backgroundColor: '#f8f9fa' }}>
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <Badge size="sm" variant="outline" color="gray">จุดที่ {index + 1}</Badge>
                                {stop.lat && stop.lng && <Badge size="xs" variant="light" color="green">📍 มีพิกัด</Badge>}
                            </Group>
                            <Group gap={4}>
                                <ActionIcon size="xs" variant="subtle" disabled={index === 0} onClick={() => moveFormStop(index, 'up')}>
                                    <TbArrowUp size={14} />
                                </ActionIcon>
                                <ActionIcon size="xs" variant="subtle" disabled={index === formStops.length - 1} onClick={() => moveFormStop(index, 'down')}>
                                    <TbArrowDown size={14} />
                                </ActionIcon>
                                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeFormStop(index)}>
                                    <TbTrash size={14} />
                                </ActionIcon>
                            </Group>
                        </Group>

                        <SimpleGrid cols={2} spacing="xs">
                            <LocationSelect
                                locations={locations}
                                value={stop.location_name}
                                onChange={(name, loc) => handleStopLocationChange(index, name, loc)}
                                onCreateNew={(name) => handleCreateNewLocation(name, false, index)}
                                label="สถานที่"
                                placeholder="พิมพ์ค้นหาหรือเลือก..."
                            />
                            <NumberInput
                                label="ระยะทาง (km)" placeholder="0"
                                value={stop.distance_km}
                                onChange={(v) => updateFormStop(index, 'distance_km', v || 0)}
                                size="sm" min={0} decimalScale={1}
                                leftSection={<TbRoute size={14} />}
                            />
                        </SimpleGrid>

                        <SimpleGrid cols={2} spacing="xs" mt="xs">
                            <TextInput
                                label="เวลาโดยประมาณ" placeholder="เช่น 09:00 หรือ ~30 นาที"
                                value={stop.estimated_time}
                                onChange={(e) => updateFormStop(index, 'estimated_time', e.currentTarget.value)}
                                size="sm" leftSection={<TbClock size={14} />}
                            />
                            <TextInput
                                label="งาน/เอกสาร" placeholder="เช่น จดทะเบียนบริษัท, ยื่น VAT"
                                value={stop.tasks.join(', ')}
                                onChange={(e) => updateFormStop(index, 'tasks', e.currentTarget.value.split(',').map(t => t.trim()))}
                                size="sm"
                            />
                        </SimpleGrid>

                        <TextInput
                            label="หมายเหตุ" placeholder="หมายเหตุสำหรับจุดนี้..."
                            value={stop.notes}
                            onChange={(e) => updateFormStop(index, 'notes', e.currentTarget.value)}
                            size="sm" mt="xs" leftSection={<TbNotes size={14} />}
                        />
                    </Card>
                ))}

                <Button variant="light" leftSection={<TbPlus size={16} />} onClick={addFormStop} fullWidth>
                    เพิ่มจุดแวะ
                </Button>

                {/* Auto-calc distance */}
                {formStops.length > 0 && (
                    <Card withBorder radius="md" p="sm" style={{ backgroundColor: '#fff3e0', borderColor: '#ffa726' }}>
                        <Group justify="space-between" align="center">
                            <div>
                                <Text size="sm" fw={600} c="orange.8">
                                    <TbCalculator size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                                    คำนวณระยะทางอัตโนมัติ
                                </Text>
                                <Text size="xs" c="dimmed" mt={2}>
                                    {geocodedCount}/{formStops.length} จุดมีพิกัด
                                    {startLat && startLng ? ' + จุดเริ่มต้น ✅' : ' — ยังไม่มีพิกัดจุดเริ่มต้น'}
                                </Text>
                            </div>
                            <Button
                                size="sm" color="orange"
                                leftSection={<TbCalculator size={16} />}
                                onClick={autoCalcAllDistances}
                                loading={calcInProgress}
                                disabled={!startLat || !startLng || formStops.length === 0}
                            >
                                คำนวณ
                            </Button>
                        </Group>
                        {calcInProgress && <Progress value={100} animated size="xs" mt="xs" color="orange" />}
                    </Card>
                )}

                <Divider />

                <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>ยกเลิก</Button>
                    <Button onClick={handleCreate} loading={creating} leftSection={<TbCheck size={16} />}>
                        สร้างตาราง
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
