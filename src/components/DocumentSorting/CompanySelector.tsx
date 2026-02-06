/**
 * Company Selector Component
 * Component สำหรับเลือกบริษัทจากรายการงานรับผิดชอบ (accounting_responsible)
 */

import { useMemo } from 'react'
import { Select, Stack, Text } from '@mantine/core'
import { useQuery } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import { getCurrentTaxMonth } from '../../utils/taxMonthUtils'
import LoadingSpinner from '../Loading/LoadingSpinner'

interface CompanyOption {
  value: string // build
  label: string // company_name (build)
}

interface CompanySelectorProps {
  value?: string | null
  onChange: (build: string | null) => void
  disabled?: boolean
}

export default function CompanySelector({ value, onChange, disabled = false }: CompanySelectorProps) {
  const { user } = useAuthStore()
  const employeeId = user?.employee_id || null

  // Get current tax month (ย้อนหลัง 1 เดือนจากเดือนปฏิทินปัจจุบัน)
  const currentTaxMonth = getCurrentTaxMonth()

  // Fetch companies from monthly_tax_data (filter by accounting_responsible)
  const {
    data: taxDataResponse,
    isLoading,
    error,
  } = useQuery(
    ['monthly-tax-data', 'document-sorting-companies', employeeId, currentTaxMonth.year, currentTaxMonth.month],
    () =>
      monthlyTaxDataService.getList({
        accounting_responsible: employeeId || undefined,
        year: currentTaxMonth.year,
        month: currentTaxMonth.month,
        limit: 1000, // Get all companies
      }),
    {
      enabled: !!employeeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Transform data to Select options
  const companyOptions: CompanyOption[] = useMemo(() => {
    if (!taxDataResponse?.data) return []

    // Get unique builds with company names
    const buildMap = new Map<string, string>()
    taxDataResponse.data.forEach((item) => {
      if (item.build && !buildMap.has(item.build)) {
        buildMap.set(item.build, item.company_name || item.build)
      }
    })

    return Array.from(buildMap.entries())
      .map(([build, companyName]) => ({
        value: build,
        label: `${companyName} (${build})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [taxDataResponse?.data])

  if (isLoading) {
    return (
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          เลือกบริษัท
        </Text>
        <LoadingSpinner />
      </Stack>
    )
  }

  if (error) {
    return (
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          เลือกบริษัท
        </Text>
        <Text size="sm" c="red">
          ไม่สามารถโหลดข้อมูลบริษัทได้
        </Text>
      </Stack>
    )
  }

  if (companyOptions.length === 0) {
    return (
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          เลือกบริษัท
        </Text>
        <Text size="sm" c="dimmed">
          ไม่พบข้อมูลบริษัทที่รับผิดชอบ
        </Text>
      </Stack>
    )
  }

  return (
    <Select
      label="เลือกบริษัท"
      placeholder="เลือกบริษัท"
      data={companyOptions}
      value={value || null}
      onChange={(val) => onChange(val)}
      disabled={disabled}
      searchable
      clearable
      required
    />
  )
}
