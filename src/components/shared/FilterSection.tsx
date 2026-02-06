import { Group, Text, Radio, TextInput, MultiSelect, Button, Stack, Card, Badge, Flex, Paper } from '@mantine/core'
import { DatePickerInput, DateValue } from '@mantine/dates'
import { TbSearch, TbRefresh, TbFilter, TbX, TbCalendar } from 'react-icons/tb'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'

// สถานะสำหรับการกรองข้อมูล
const statusOptions = [
  { value: 'received_receipt', label: 'รับใบเสร็จแล้ว' },
  { value: 'paid', label: 'ชำระแล้ว' },
  { value: 'sent_to_customer', label: 'ส่งลูกค้าแล้ว' },
  { value: 'draft_completed', label: 'ร่างแบบเสร็จแล้ว' },
  { value: 'passed', label: 'ผ่าน' },
  { value: 'pending_review', label: 'รอตรวจ' },
  { value: 'pending_recheck', label: 'รอตรวจอีกครั้ง' },
  { value: 'draft_ready', label: 'ร่างแบบได้' },
  { value: 'needs_correction', label: 'แก้ไข' },
  { value: 'inquire_customer', label: 'สอบถามลูกค้าเพิ่มเติม' },
  { value: 'additional_review', label: 'ตรวจสอบเพิ่มเติม' },
  { value: 'not_started', label: 'สถานะยังไม่ดำเนินการ' },
]

// สถานะยอดชำระ ภ.พ.30 สำหรับการกรอง
const paymentStatusOptions = [
  { value: 'has_payment', label: 'มียอดชำระ' },
  { value: 'no_payment', label: 'ไม่มียอดชำระ' },
]

export interface FilterValues {
  filterType: 'build' | 'date'
  filterMode: 'all' | 'wht' | 'vat' // โหมดการกรอง: ทั้งหมด, ภาษีหัก ณ ที่จ่าย, ภาษีมูลค่าเพิ่ม
  searchValue: string
  dateFrom: Date | null
  dateTo: Date | null
  whtStatus: string[]
  pp30Status: string[] // สถานะ ภ.พ.30 (เปลี่ยนชื่อจาก vatStatus เป็น pp30Status เพื่อให้ชัดเจนว่าเป็นสถานะ ภ.พ.30)
  pp30PaymentStatus: string[] // สถานะยอดชำระ ภ.พ.30
}

interface FilterSectionProps {
  onFilterChange?: (filters: FilterValues) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function FilterSection({ onFilterChange, onRefresh, isRefreshing = false }: FilterSectionProps) {
  const [filterType, setFilterType] = useState<'build' | 'date'>('build')
  const [filterMode, setFilterMode] = useState<'all' | 'wht' | 'vat'>('all') // โหมดการกรอง: ทั้งหมด, ภาษีหัก ณ ที่จ่าย, ภาษีมูลค่าเพิ่ม
  const [searchValue, setSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<DateValue>(null)
  const [dateTo, setDateTo] = useState<DateValue>(null)
  const [whtStatus, setWhtStatus] = useState<string[]>([])
  const [pp30Status, setPp30Status] = useState<string[]>([]) // สถานะ ภ.พ.30 (เปลี่ยนชื่อจาก vatStatus)
  const [pp30PaymentStatus, setPp30PaymentStatus] = useState<string[]>([]) // สถานะยอดชำระ ภ.พ.30

  // คำนวณจำนวน Active Filters
  const activeFiltersCount =
    (filterMode !== 'all' ? 1 : 0) +
    (searchValue ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (whtStatus.length > 0 ? 1 : 0) +
    (pp30Status.length > 0 ? 1 : 0) +
    (pp30PaymentStatus.length > 0 ? 1 : 0)

  // ส่ง filter values ไปยัง parent component เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        filterType,
        filterMode,
        searchValue,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        whtStatus,
        pp30Status,
        pp30PaymentStatus,
      })
    }
  }, [filterType, filterMode, searchValue, dateFrom, dateTo, whtStatus, pp30Status, pp30PaymentStatus, onFilterChange])

  const handleReset = () => {
    setFilterMode('all')
    setSearchValue('')
    setDateFrom(null)
    setDateTo(null)
    setWhtStatus([])
    setPp30Status([])
    setPp30PaymentStatus([])
    // ⚠️ สำคัญ: เรียก onRefresh เพื่อโหลดข้อมูลรายการงานที่รับผิดชอบใหม่ทันที
    if (onRefresh) {
      onRefresh()
    }
  }

  const removeWhtStatus = (valueToRemove: string) => {
    setWhtStatus(whtStatus.filter((v) => v !== valueToRemove))
  }

  const removePp30Status = (valueToRemove: string) => {
    setPp30Status(pp30Status.filter((v) => v !== valueToRemove))
  }

  const removePp30PaymentStatus = (valueToRemove: string) => {
    setPp30PaymentStatus(pp30PaymentStatus.filter((v) => v !== valueToRemove))
  }

  const getStatusLabel = (value: string) => {
    return statusOptions.find((opt) => opt.value === value)?.label || value
  }

  return (
    <Card shadow="sm" radius="lg" withBorder p="lg" mb="lg">
      <Stack gap="md">
        {/* Filter Mode Selection */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            โหมดการแสดงผล:
          </Text>
          <Radio.Group value={filterMode} onChange={(value) => setFilterMode(value as 'all' | 'wht' | 'vat')}>
            <Group mt="xs">
              <Radio value="all" label="ทั้งหมด" />
              <Radio value="wht" label="ภาษีหัก ณ ที่จ่าย" />
              <Radio value="vat" label="ภาษีมูลค่าเพิ่ม" />
            </Group>
          </Radio.Group>
        </div>

        {/* Filter Type Selection with Active Filters Count */}
        <Flex justify="space-between" align="center">
          <div>
            <Text size="sm" fw={500} mb="xs">
              เลือกประเภทการกรอง:
            </Text>
            <Radio.Group value={filterType} onChange={(value) => setFilterType(value as 'build' | 'date')}>
              <Group mt="xs">
                <Radio value="build" label="หมายเลข Build" />
                <Radio value="date" label="วันที่และเวลา" />
              </Group>
            </Radio.Group>
          </div>
          {activeFiltersCount > 0 && (
            <Badge size="lg" color="orange" variant="filled" style={{ backgroundColor: '#ff6b35' }}>
              {activeFiltersCount} ตัวกรองที่ใช้งาน
            </Badge>
          )}
        </Flex>

        {/* Search and Filters */}
        <Group align="flex-end" gap="md">
          {filterType === 'build' ? (
            <TextInput
              label="หมายเลข Build / ชื่อบริษัท"
              placeholder="กรอกหมายเลข Build หรือชื่อบริษัท"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              leftSection={<TbSearch size={16} />}
              style={{ flex: 1 }}
              radius="lg"
            />
          ) : (
            <Group style={{ flex: 1 }} align="flex-end" gap="xs">
              <DatePickerInput
                label="วันที่เริ่มต้น"
                placeholder="เลือกวันที่เริ่มต้น"
                value={dateFrom}
                onChange={setDateFrom}
                leftSection={<TbCalendar size={16} />}
                radius="lg"
                clearable
                style={{ flex: 1 }}
              />
              <DatePickerInput
                label="วันที่สิ้นสุด"
                placeholder="เลือกวันที่สิ้นสุด"
                value={dateTo}
                onChange={setDateTo}
                leftSection={<TbCalendar size={16} />}
                radius="lg"
                clearable
                style={{ flex: 1 }}
                minDate={dateFrom || undefined}
              />
            </Group>
          )}

          <MultiSelect
            label="สถานะ WHT"
            placeholder="เลือกสถานะที่ต้องการกรอง"
            value={whtStatus}
            onChange={setWhtStatus}
            data={statusOptions}
            radius="lg"
            searchable
            clearable
            style={{ minWidth: 225 }}
          />

          <MultiSelect
            label="สถานะ ภ.พ.30"
            placeholder="เลือกสถานะที่ต้องการกรอง"
            value={pp30Status}
            onChange={setPp30Status}
            data={statusOptions}
            radius="lg"
            searchable
            clearable
            style={{ minWidth: 225 }}
          />

          <MultiSelect
            label="สถานะยอดชำระ ภ.พ.30"
            placeholder="เลือกสถานะที่ต้องการกรอง"
            value={pp30PaymentStatus}
            onChange={setPp30PaymentStatus}
            data={paymentStatusOptions}
            radius="lg"
            searchable
            clearable
            style={{ minWidth: 225 }}
          />

          <Button
            leftSection={<TbRefresh size={18} />}
            variant="filled"
            color="orange"
            radius="lg"
            onClick={() => {
              if (onRefresh) {
                onRefresh()
              }
            }}
            loading={isRefreshing}
            style={{ backgroundColor: '#ff6b35', color: 'white' }}
          >
            รีเฟรชข้อมูล
          </Button>

          <Button
            leftSection={<TbFilter size={18} />}
            variant="filled"
            color="orange"
            radius="lg"
            onClick={handleReset}
            disabled={activeFiltersCount === 0}
            style={{ backgroundColor: '#ff6b35', color: 'white' }}
          >
            รีเซ็ตฟิลเตอร์
          </Button>
        </Group>

        {/* Filter Summary */}
        {(filterMode !== 'all' || searchValue || dateFrom || dateTo || whtStatus.length > 0 || pp30Status.length > 0 || pp30PaymentStatus.length > 0) && (
          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fff8f5' }}>
            <Text size="sm" fw={500} mb="xs">
              ตัวกรองที่เลือก:
            </Text>
            <Group gap="xs">
              {filterMode !== 'all' && (
                <Badge
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setFilterMode('all')}
                    />
                  }
                >
                  โหมด: {filterMode === 'wht' ? 'ภาษีหัก ณ ที่จ่าย' : filterMode === 'vat' ? 'ภาษีมูลค่าเพิ่ม' : 'ทั้งหมด'}
                </Badge>
              )}
              {filterType === 'build' && searchValue && (
                <Badge
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSearchValue('')}
                    />
                  }
                >
                  {filterType === 'build' ? 'Build/ชื่อบริษัท' : 'วันที่'}: {searchValue}
                </Badge>
              )}
              {filterType === 'date' && (dateFrom || dateTo) && (
                <Badge
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setDateFrom(null)
                        setDateTo(null)
                      }}
                    />
                  }
                >
                  วันที่:{' '}
                  {dateFrom ? dayjs(dateFrom).format('DD/MM/YYYY') : '...'} -{' '}
                  {dateTo ? dayjs(dateTo).format('DD/MM/YYYY') : '...'}
                </Badge>
              )}
              {whtStatus.map((status) => (
                <Badge
                  key={`wht-${status}`}
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeWhtStatus(status)}
                    />
                  }
                >
                  WHT: {getStatusLabel(status)}
                </Badge>
              ))}
              {pp30Status.map((status) => (
                <Badge
                  key={`pp30-${status}`}
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removePp30Status(status)}
                    />
                  }
                >
                  สถานะ ภ.พ.30: {getStatusLabel(status)}
                </Badge>
              ))}
              {pp30PaymentStatus.map((status) => {
                const paymentLabel = paymentStatusOptions.find((opt) => opt.value === status)?.label || status
                return (
                  <Badge
                    key={`pp30-payment-${status}`}
                    size="lg"
                    variant="light"
                    color="orange"
                    rightSection={
                      <TbX
                        size={14}
                        style={{ cursor: 'pointer' }}
                        onClick={() => removePp30PaymentStatus(status)}
                      />
                    }
                  >
                    สถานะยอดชำระ ภ.พ.30: {paymentLabel}
                  </Badge>
                )
              })}
            </Group>
          </Paper>
        )}
      </Stack>
    </Card>
  )
}
