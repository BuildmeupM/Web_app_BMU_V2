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

// Quick Filter Options (สถานะที่ใช้บ่อย)
const quickFilters = [
  { label: 'รอตรวจ', wht: ['pending_review'], vat: ['pending_review'] },
  { label: 'รอตรวจอีกครั้ง', wht: ['pending_recheck'], vat: ['pending_recheck'] },
  { label: 'ตรวจแล้ว', wht: ['passed', 'draft_completed'], vat: ['passed', 'draft_completed'] },
]

export interface FilterValues {
  filterType: 'build' | 'date'
  searchValue: string
  dateFrom: Date | null
  dateTo: Date | null
  whtStatus: string[]
  vatStatus: string[]
}

interface FilterSectionProps {
  onFilterChange?: (filters: FilterValues) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function FilterSection({ onFilterChange, onRefresh, isRefreshing = false }: FilterSectionProps) {
  const [filterType, setFilterType] = useState<'build' | 'date'>('build')
  const [searchValue, setSearchValue] = useState('')
  const [dateFrom, setDateFrom] = useState<DateValue>(null)
  const [dateTo, setDateTo] = useState<DateValue>(null)
  const [whtStatus, setWhtStatus] = useState<string[]>([])
  const [vatStatus, setVatStatus] = useState<string[]>([])

  // คำนวณจำนวน Active Filters
  const activeFiltersCount =
    (searchValue ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (whtStatus.length > 0 ? 1 : 0) +
    (vatStatus.length > 0 ? 1 : 0)

  // ส่ง filter values ไปยัง parent component เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        filterType,
        searchValue,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        whtStatus,
        vatStatus,
      })
    }
  }, [filterType, searchValue, dateFrom, dateTo, whtStatus, vatStatus, onFilterChange])

  const handleReset = () => {
    setSearchValue('')
    setDateFrom(null)
    setDateTo(null)
    setWhtStatus([])
    setVatStatus([])
    // ⚠️ สำคัญ: เรียก onRefresh เพื่อโหลดข้อมูลรายการงานที่รับผิดชอบใหม่ทันที
    if (onRefresh) {
      onRefresh()
    }
  }

  const handleQuickFilter = (wht: string[], vat: string[]) => {
    setWhtStatus(wht)
    setVatStatus(vat)
  }

  const removeWhtStatus = (valueToRemove: string) => {
    setWhtStatus(whtStatus.filter((v) => v !== valueToRemove))
  }

  const removeVatStatus = (valueToRemove: string) => {
    setVatStatus(vatStatus.filter((v) => v !== valueToRemove))
  }

  const getStatusLabel = (value: string) => {
    return statusOptions.find((opt) => opt.value === value)?.label || value
  }

  return (
    <Card shadow="sm" radius="lg" withBorder p="lg" mb="lg">
      <Stack gap="md">
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

        {/* Quick Filter Buttons */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            กรองด่วน:
          </Text>
          <Group gap="xs">
            {quickFilters.map((filter, index) => (
              <Button
                key={index}
                size="xs"
                variant="outline"
                color="orange"
                radius="lg"
                onClick={() => handleQuickFilter(filter.wht, filter.vat)}
                style={{
                  borderColor: '#ff6b35',
                  color: '#ff6b35',
                }}
              >
                {filter.label}
              </Button>
            ))}
          </Group>
        </div>

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
            label="สถานะ VAT"
            placeholder="เลือกสถานะที่ต้องการกรอง"
            value={vatStatus}
            onChange={setVatStatus}
            data={statusOptions}
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
        {(searchValue || dateFrom || dateTo || whtStatus.length > 0 || vatStatus.length > 0) && (
          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fff8f5' }}>
            <Text size="sm" fw={500} mb="xs">
              ตัวกรองที่เลือก:
            </Text>
            <Group gap="xs">
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
              {vatStatus.map((status) => (
                <Badge
                  key={`vat-${status}`}
                  size="lg"
                  variant="light"
                  color="orange"
                  rightSection={
                    <TbX
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeVatStatus(status)}
                    />
                  }
                >
                  VAT: {getStatusLabel(status)}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}
      </Stack>
    </Card>
  )
}
