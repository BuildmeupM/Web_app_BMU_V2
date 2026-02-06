/**
 * Summary Stats Component
 * Component สำหรับแสดงสรุปข้อมูลการส่งงานคีย์
 */

import { Card, Text, Stack, SimpleGrid, Accordion, Badge, Group, ActionIcon, Tooltip } from '@mantine/core'
import { useQuery } from 'react-query'
import { useAuthStore } from '../../store/authStore'
import documentEntryWorkService from '../../services/documentEntryWorkService'
import monthlyTaxDataService from '../../services/monthlyTaxDataService'
import { useMemo } from 'react'

interface SummaryStatsProps {
  year: number
  month: number
  onSelectCompany?: (buildId: string, companyName?: string) => void
}

export default function SummaryStats({ year, month, onSelectCompany }: SummaryStatsProps) {
  const { user } = useAuthStore()
  const employeeId = user?.employee_id || null

  // Fetch all document entry work entries
  const {
    data: documentEntryWorkResponse,
    isLoading: isLoadingDocumentWork,
  } = useQuery(
    ['document-entry-work', 'summary', year, month, employeeId],
    () =>
      documentEntryWorkService.getList({
        year,
        month,
        accounting_responsible: employeeId || undefined,
        limit: 1000, // Get all entries
      }),
    {
      enabled: !!employeeId,
      staleTime: 1 * 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Fetch companies from monthly_tax_data to get company names
  const {
    data: taxDataResponse,
    isLoading: isLoadingTaxData,
  } = useQuery(
    ['monthly-tax-data', 'summary-companies', employeeId, year, month],
    () =>
      monthlyTaxDataService.getList({
        accounting_responsible: employeeId || undefined,
        year: String(year),
        month: String(month),
        limit: 1000, // Get all companies
      }),
    {
      enabled: !!employeeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  const isLoading = isLoadingDocumentWork || isLoadingTaxData

  // Create build to company name map
  const buildToCompanyMap = useMemo(() => {
    const map = new Map<string, string>()
    if (taxDataResponse?.data) {
      taxDataResponse.data.forEach((item) => {
        if (item.build && !map.has(item.build)) {
          map.set(item.build, item.company_name || item.build)
        }
      })
    }
    return map
  }, [taxDataResponse?.data])

  // Calculate summary statistics with company lists
  const summary = useMemo(() => {
    if (!documentEntryWorkResponse?.data) {
      return {
        totalCompanies: 0,
        totalSubmissions: 0,
        completedCompanies: 0,
        partiallyCompletedCompanies: 0,
        incompleteCompanies: 0,
        completedCompanyList: [] as Array<{ build: string; companyName: string }>,
        partiallyCompletedCompanyList: [] as Array<{ build: string; companyName: string }>,
        incompleteCompanyList: [] as Array<{ build: string; companyName: string }>,
      }
    }

    const entries = documentEntryWorkResponse.data

    // Get unique builds (companies)
    const uniqueBuilds = new Set<string>()
    entries.forEach((entry) => {
      if (entry.build) {
        uniqueBuilds.add(entry.build)
      }
    })

    // Count total submissions
    const totalSubmissions = entries.length

    // Lists for completed, partially completed, and incomplete companies
    const completedCompanyList: Array<{ build: string; companyName: string }> = []
    const partiallyCompletedCompanyList: Array<{ build: string; companyName: string }> = []
    const incompleteCompanyList: Array<{ build: string; companyName: string }> = []

    uniqueBuilds.forEach((build) => {
      // Get all entries for this company
      const companyEntries = entries.filter((e) => e.build === build)

      // Get company name
      const companyName = buildToCompanyMap.get(build) || build

      // Check if company has any documents
      const hasDocuments = companyEntries.some(
        (e) => (e.wht_document_count || 0) > 0 ||
          (e.vat_document_count || 0) > 0 ||
          (e.non_vat_document_count || 0) > 0
      )

      if (!hasDocuments) {
        // No documents at all (bot data only) - don't count in any category
        // Skip this company entirely
        return
      } else {
        // Check status for each document type
        let hasCompletedAny = false
        let hasIncompleteAny = false

        companyEntries.forEach((entry) => {
          // Check WHT
          if ((entry.wht_document_count || 0) > 0) {
            if (entry.wht_entry_status === 'ดำเนินการเสร็จแล้ว') {
              hasCompletedAny = true
            } else {
              hasIncompleteAny = true
            }
          }
          // Check VAT
          if ((entry.vat_document_count || 0) > 0) {
            if (entry.vat_entry_status === 'ดำเนินการเสร็จแล้ว') {
              hasCompletedAny = true
            } else {
              hasIncompleteAny = true
            }
          }
          // Check Non-VAT
          if ((entry.non_vat_document_count || 0) > 0) {
            if (entry.non_vat_entry_status === 'ดำเนินการเสร็จแล้ว') {
              hasCompletedAny = true
            } else {
              hasIncompleteAny = true
            }
          }
        })

        if (hasCompletedAny && !hasIncompleteAny) {
          // All completed
          completedCompanyList.push({ build, companyName })
        } else if (hasCompletedAny && hasIncompleteAny) {
          // Partially completed
          partiallyCompletedCompanyList.push({ build, companyName })
        } else {
          // None completed
          incompleteCompanyList.push({ build, companyName })
        }
      }
    })

    // Sort company lists by company name
    completedCompanyList.sort((a, b) => a.companyName.localeCompare(b.companyName))
    partiallyCompletedCompanyList.sort((a, b) => a.companyName.localeCompare(b.companyName))
    incompleteCompanyList.sort((a, b) => a.companyName.localeCompare(b.companyName))

    return {
      totalCompanies: uniqueBuilds.size,
      totalSubmissions,
      completedCompanies: completedCompanyList.length,
      partiallyCompletedCompanies: partiallyCompletedCompanyList.length,
      incompleteCompanies: incompleteCompanyList.length,
      completedCompanyList,
      partiallyCompletedCompanyList,
      incompleteCompanyList,
    }
  }, [documentEntryWorkResponse?.data, buildToCompanyMap])

  if (isLoading) {
    return null // Don't show anything while loading
  }

  return (
    <Card shadow="sm" radius="md" withBorder p="md" mb="md" style={{ backgroundColor: '#fff8f0' }}>
      <Stack gap="md">
        <Text size="lg" fw={600} c="#ff6b35">
          สรุปข้อมูลการส่งงานคีย์
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="md">
          <Card withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" ta="center">
                จำนวนบริษัทที่ส่งงานคีย์
              </Text>
              <Text size="xl" fw={700} c="#ff6b35">
                {summary.totalCompanies}
              </Text>
              <Text size="xs" c="dimmed">
                บริษัท
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" ta="center">
                จำนวนครั้งที่ส่งข้อมูล
              </Text>
              <Text size="xl" fw={700} c="#ff6b35">
                {summary.totalSubmissions}
              </Text>
              <Text size="xs" c="dimmed">
                ครั้ง
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" ta="center">
                ดำเนินการเสร็จแล้ว
              </Text>
              <Text size="xl" fw={700} c="green">
                {summary.completedCompanies}
              </Text>
              <Text size="xs" c="dimmed">
                บริษัท
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" ta="center">
                เสร็จบางส่วน
              </Text>
              <Text size="xl" fw={700} c="orange">
                {summary.partiallyCompletedCompanies}
              </Text>
              <Text size="xs" c="dimmed">
                บริษัท
              </Text>
            </Stack>
          </Card>

          <Card withBorder p="sm" radius="md" style={{ backgroundColor: '#fff' }}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" ta="center">
                ยังไม่ดำเนินการเสร็จ
              </Text>
              <Text size="xl" fw={700} c="red">
                {summary.incompleteCompanies}
              </Text>
              <Text size="xs" c="dimmed">
                บริษัท
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Company Lists */}
        {(summary.completedCompanyList.length > 0 || summary.partiallyCompletedCompanyList.length > 0 || summary.incompleteCompanyList.length > 0) && (
          <Accordion variant="separated" radius="md">
            {summary.completedCompanyList.length > 0 && (
              <Accordion.Item value="completed">
                <Accordion.Control>
                  <Group gap="xs">
                    <Badge color="green" size="lg">
                      {summary.completedCompanyList.length}
                    </Badge>
                    <Text fw={600} c="green">
                      บริษัทที่ดำเนินการเสร็จแล้ว
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs" mt="xs">
                    {summary.completedCompanyList.map((company) => (
                      <Group key={company.build} gap="xs" p="xs" style={{ borderRadius: 4, backgroundColor: '#f0f9f0' }} justify="space-between">
                        <Group gap="xs">
                          <Badge variant="dot" color="green" size="sm">
                            {company.build}
                          </Badge>
                          <Text size="sm">{company.companyName}</Text>
                        </Group>
                        {onSelectCompany && (
                          <Tooltip label="เลือกบริษัทนี้">
                            <ActionIcon
                              variant="light"
                              color="green"
                              size="sm"
                              onClick={() => onSelectCompany(company.build, company.companyName)}
                            >
                              →
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {summary.partiallyCompletedCompanyList.length > 0 && (
              <Accordion.Item value="partial">
                <Accordion.Control>
                  <Group gap="xs">
                    <Badge color="orange" size="lg">
                      {summary.partiallyCompletedCompanyList.length}
                    </Badge>
                    <Text fw={600} c="orange">
                      บริษัทที่ดำเนินการเสร็จบางส่วน
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs" mt="xs">
                    {summary.partiallyCompletedCompanyList.map((company) => (
                      <Group key={company.build} gap="xs" p="xs" style={{ borderRadius: 4, backgroundColor: '#fff8e6' }} justify="space-between">
                        <Group gap="xs">
                          <Badge variant="dot" color="orange" size="sm">
                            {company.build}
                          </Badge>
                          <Text size="sm">{company.companyName}</Text>
                        </Group>
                        {onSelectCompany && (
                          <Tooltip label="เลือกบริษัทนี้">
                            <ActionIcon
                              variant="light"
                              color="orange"
                              size="sm"
                              onClick={() => onSelectCompany(company.build, company.companyName)}
                            >
                              →
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {summary.incompleteCompanyList.length > 0 && (
              <Accordion.Item value="incomplete">
                <Accordion.Control>
                  <Group gap="xs">
                    <Badge color="red" size="lg">
                      {summary.incompleteCompanyList.length}
                    </Badge>
                    <Text fw={600} c="red">
                      บริษัทที่ยังไม่ดำเนินการเสร็จ
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs" mt="xs">
                    {summary.incompleteCompanyList.map((company) => (
                      <Group key={company.build} gap="xs" p="xs" style={{ borderRadius: 4, backgroundColor: '#fff5f5' }} justify="space-between">
                        <Group gap="xs">
                          <Badge variant="dot" color="red" size="sm">
                            {company.build}
                          </Badge>
                          <Text size="sm">{company.companyName}</Text>
                        </Group>
                        {onSelectCompany && (
                          <Tooltip label="เลือกบริษัทนี้">
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="sm"
                              onClick={() => onSelectCompany(company.build, company.companyName)}
                            >
                              →
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
          </Accordion>
        )}
      </Stack>
    </Card>
  )
}
