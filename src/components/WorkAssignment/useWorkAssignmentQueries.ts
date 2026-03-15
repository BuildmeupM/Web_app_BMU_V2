/**
 * useWorkAssignmentQueries — Custom hook for all data-fetching queries
 * Extracted from WorkAssignment page (~L290-520)
 */

import { useQuery, useQueryClient } from 'react-query'
import { useDebouncedValue } from '@mantine/hooks'
import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import { TbCheck, TbAlertCircle } from 'react-icons/tb'
import workAssignmentsService from '../../services/workAssignmentsService'
import clientsService from '../../services/clientsService'
import { employeeService } from '../../services/employeeService'
import usersService from '../../services/usersService'
import { isApiError } from '../../types/errors'
import { mapUsersToOptions } from './helpers'

interface UseWorkAssignmentQueriesParams {
  isAdmin: boolean
  hasHydrated: boolean
  page: number
  limit: number
  build: string
  year: string | null
  month: string | null
  search: string
  syncStatusFilter: 'all' | 'synced' | 'unsynced'
  filterByAccounting: string | null
  filterByTaxInspection: string | null
  filterByWht: string | null
  filterByVat: string | null
  filterByDocumentEntry: string | null
  getViewMonth: () => { year: number; month: number }
  companyStatusFilter: string
}

export function useWorkAssignmentQueries(params: UseWorkAssignmentQueriesParams) {
  const {
    isAdmin, hasHydrated, page, limit, build, year, month, search,
    syncStatusFilter, filterByAccounting, filterByTaxInspection,
    filterByWht, filterByVat, filterByDocumentEntry,
    getViewMonth, companyStatusFilter,
  } = params

  const queryClient = useQueryClient()

  // Client dropdown search
  const [clientSearchValue, setClientSearchValue] = useState('')
  const [debouncedClientSearch] = useDebouncedValue(clientSearchValue, 300)

  // User dropdown search states
  const [accountingUserSearch, setAccountingUserSearch] = useState('')
  const [debouncedAccountingUserSearch] = useDebouncedValue(accountingUserSearch, 300)
  const [taxInspectionUserSearch, setTaxInspectionUserSearch] = useState('')
  const [debouncedTaxInspectionUserSearch] = useDebouncedValue(taxInspectionUserSearch, 300)
  const [filingUserSearch, setFilingUserSearch] = useState('')
  const [debouncedFilingUserSearch] = useDebouncedValue(filingUserSearch, 300)
  const [documentEntryUserSearch, setDocumentEntryUserSearch] = useState('')
  const [debouncedDocumentEntryUserSearch] = useDebouncedValue(documentEntryUserSearch, 300)

  // Main assignments query
  const assignmentsQuery = useQuery(
    ['work-assignments', page, limit, build, year, month, search, syncStatusFilter, filterByAccounting, filterByTaxInspection, filterByWht, filterByVat, filterByDocumentEntry],
    () => {
      const viewMonth = getViewMonth()
      return workAssignmentsService.getList({
        page, limit,
        build: build || undefined,
        year: year || viewMonth.year.toString(),
        month: month || viewMonth.month.toString(),
        search: search || undefined,
        sync_status: syncStatusFilter !== 'all' ? syncStatusFilter : undefined,
        accounting_responsible: filterByAccounting || undefined,
        tax_inspection_responsible: filterByTaxInspection || undefined,
        wht_filer_responsible: filterByWht || undefined,
        vat_filer_responsible: filterByVat || undefined,
        document_entry_responsible: filterByDocumentEntry || undefined,
        sortBy: 'build',
        sortOrder: 'asc',
      })
    },
    {
      enabled: isAdmin && hasHydrated,
      keepPreviousData: true,
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false,
      retry: (failureCount, error: unknown) => {
        if (isApiError(error) && error.response?.status === 429) return false
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error: unknown) => {
        if (isApiError(error) && error.response?.status === 429) {
          notifications.show({
            title: 'คำขอมากเกินไป',
            message: 'กรุณารอสักครู่แล้วรีเฟรชหน้าเว็บ',
            color: 'orange',
            autoClose: 5000,
          })
        }
      },
    }
  )

  // Clients dropdown (lightweight, search-on-type)
  const clientsDropdownQuery = useQuery(
    ['clients-dropdown', companyStatusFilter, debouncedClientSearch],
    () => clientsService.getDropdownList({
      company_status: companyStatusFilter === 'all' ? undefined : companyStatusFilter,
      search: debouncedClientSearch || undefined,
      limit: 5,
    }),
    { enabled: isAdmin, staleTime: 30 * 1000, keepPreviousData: true }
  )

  // Employees list (for name resolution)
  const employeesQuery = useQuery(
    ['employees-list'],
    () => employeeService.getAll({ limit: 1000, status: 'active' }),
    {
      enabled: isAdmin,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        if (isApiError(error) && error.response?.status === 429) return false
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  )

  // Role-based user queries
  const accountingUsersQuery = useQuery(
    ['users-accounting', debouncedAccountingUserSearch],
    () => usersService.getList({
      roles: 'admin,service,data_entry_and_service,audit',
      status: 'active',
      search: debouncedAccountingUserSearch || undefined,
      limit: 5,
    }),
    { enabled: isAdmin && hasHydrated, staleTime: 30 * 1000, keepPreviousData: true }
  )

  const taxInspectionUsersQuery = useQuery(
    ['users-tax-inspection', debouncedTaxInspectionUserSearch],
    () => usersService.getList({
      role: 'audit',
      status: 'active',
      search: debouncedTaxInspectionUserSearch || undefined,
      limit: 5,
    }),
    { enabled: isAdmin && hasHydrated, staleTime: 30 * 1000, keepPreviousData: true }
  )

  const filingUsersQuery = useQuery(
    ['users-filing', debouncedFilingUserSearch],
    () => usersService.getList({
      role: 'data_entry_and_service',
      status: 'active',
      search: debouncedFilingUserSearch || undefined,
      limit: 5,
    }),
    { enabled: isAdmin && hasHydrated, staleTime: 30 * 1000, keepPreviousData: true }
  )

  const documentEntryUsersQuery = useQuery(
    ['users-document-entry', debouncedDocumentEntryUserSearch],
    () => usersService.getList({
      roles: 'data_entry_and_service,data_entry',
      status: 'active',
      search: debouncedDocumentEntryUserSearch || undefined,
      limit: 5,
    }),
    { enabled: isAdmin && hasHydrated, staleTime: 30 * 1000, keepPreviousData: true }
  )

  // Derived: user options for each role
  const accountingUserOptions = mapUsersToOptions(accountingUsersQuery.data?.data)
  const taxInspectionUserOptions = mapUsersToOptions(taxInspectionUsersQuery.data?.data)
  const filingUserOptions = mapUsersToOptions(filingUsersQuery.data?.data)
  const documentEntryUserOptions = mapUsersToOptions(documentEntryUsersQuery.data?.data)

  // Derived: client options
  const clientOptions = clientsDropdownQuery.data?.map(
    (client: { build: string; company_name: string }) => ({
      value: client.build,
      label: `${client.build} - ${client.company_name}`,
    })
  ) || []

  // Refresh handler
  const handleRefresh = async () => {
    try {
      queryClient.invalidateQueries(['work-assignments'])
      await assignmentsQuery.refetch()
      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเฟรซข้อมูลเรียบร้อยแล้ว',
        color: 'green',
        icon: TbCheck({ size: 16 }),
        autoClose: 2000,
      })
    } catch {
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรซข้อมูลได้',
        color: 'red',
        icon: TbAlertCircle({ size: 16 }),
      })
    }
  }

  // Format employee name with nickname from employees list
  const formatEmployeeNameWithId = (
    name: string | null | undefined,
    employeeId: string | null | undefined
  ): string => {
    if (!name) return '-'
    if (name.includes('(') && name.includes(')')) return name
    if (employeeId && employeesQuery.data?.employees) {
      const employee = employeesQuery.data.employees.find(
        (emp) => emp.employee_id === employeeId
      )
      if (employee?.nick_name) return `${name}(${employee.nick_name})`
    }
    return name
  }

  return {
    // Queries
    assignmentsData: assignmentsQuery.data,
    isLoading: assignmentsQuery.isLoading,
    isRefetching: assignmentsQuery.isRefetching,
    error: assignmentsQuery.error,
    // Client options
    clientOptions,
    clientSearchValue,
    setClientSearchValue,
    // User options (derived)
    accountingUserOptions,
    taxInspectionUserOptions,
    filingUserOptions,
    documentEntryUserOptions,
    // User search setters
    setAccountingUserSearch,
    setTaxInspectionUserSearch,
    setFilingUserSearch,
    setDocumentEntryUserSearch,
    // Handlers
    handleRefresh,
    formatEmployeeNameWithId,
    queryClient,
  }
}
