import { useState, useEffect } from 'react'
import { Container, Title, Stack, Tabs, Group, Button, Menu } from '@mantine/core'
import { TbPlus, TbChevronDown, TbBeach, TbHome } from 'react-icons/tb'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import LeaveRequestList from '../components/Leave/LeaveRequestList'
import LeaveRequestForm from '../components/Leave/LeaveRequestForm'
import LeaveDashboard from '../components/Leave/LeaveDashboard'
import WFHRequestList from '../components/Leave/WFHRequestList'
import WFHRequestForm from '../components/Leave/WFHRequestForm'
import WFHDashboard from '../components/Leave/WFHDashboard'

export default function LeaveManagement() {
  const [searchParams, setSearchParams] = useSearchParams()

  const user = useAuthStore((state) => state.user)
  // Check if admin/hr role or specific permission based on roles
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'
  const isAudit = user?.role === 'audit'
  const canApprove = isAdmin || isAudit;

  // State for forms
  const [leaveFormOpened, setLeaveFormOpened] = useState(false)
  const [wfhFormOpened, setWfhFormOpened] = useState(false)

  // Derived state from URL search params
  const activeMainTab = searchParams.get('tab') || 'leave'

  // Default sub-tabs depending on role
  const defaultLeaveSubTab = canApprove ? 'dashboard' : 'history'
  const activeLeaveSubTab = searchParams.get('sub-leave') || defaultLeaveSubTab

  const defaultWfhSubTab = canApprove ? 'dashboard' : 'work-report'
  const activeWfhSubTab = searchParams.get('sub-wfh') || defaultWfhSubTab

  // Update URL purely on parameter change without navigating away from the page
  const handleMainTabChange = (value: string | null) => {
    if (!value) return
    searchParams.set('tab', value)

    // Set appropriate default sub-tab when main tab changes
    if (value === 'leave' && !searchParams.has('sub-leave')) {
      searchParams.set('sub-leave', defaultLeaveSubTab)
    } else if (value === 'wfh' && !searchParams.has('sub-wfh')) {
      searchParams.set('sub-wfh', defaultWfhSubTab)
    }

    setSearchParams(searchParams)
  }

  const handleLeaveSubTabChange = (value: string | null) => {
    if (!value) return
    searchParams.set('sub-leave', value)
    setSearchParams(searchParams)
  }

  const handleWfhSubTabChange = (value: string | null) => {
    if (!value) return
    searchParams.set('sub-wfh', value)
    setSearchParams(searchParams)
  }

  // Effect to clean up URL or set initial defaults
  useEffect(() => {
    let shouldUpdate = false
    const currentParams = new URLSearchParams(searchParams)

    if (!currentParams.has('tab')) {
      currentParams.set('tab', 'leave')
      shouldUpdate = true
    }

    if (currentParams.get('tab') === 'leave' && !currentParams.has('sub-leave')) {
      currentParams.set('sub-leave', defaultLeaveSubTab)
      shouldUpdate = true
    }

    if (currentParams.get('tab') === 'wfh' && !currentParams.has('sub-wfh')) {
      currentParams.set('sub-wfh', defaultWfhSubTab)
      shouldUpdate = true
    }

    if (shouldUpdate) {
      setSearchParams(currentParams, { replace: true })
    }
  }, [searchParams, setSearchParams, defaultLeaveSubTab, defaultWfhSubTab])

  return (
    <Container fluid>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={1}>ลางาน / สลับที่ทำงาน (WFH)</Title>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <Button
                leftSection={<TbPlus size={18} />}
                rightSection={<TbChevronDown size={14} />}
                radius="md"
                size="md"
              >
                สร้างคำร้องใหม่
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>เลือกประเภทคำร้อง</Menu.Label>
              <Menu.Item
                leftSection={<TbBeach size={16} />}
                onClick={() => setLeaveFormOpened(true)}
              >
                ยื่นขอลางาน
              </Menu.Item>
              <Menu.Item
                leftSection={<TbHome size={16} />}
                onClick={() => setWfhFormOpened(true)}
              >
                ยื่นขอ Work From Home
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Main Tabs: Leave / WFH */}
        <Tabs value={activeMainTab} onChange={handleMainTabChange} variant="outline" radius="md">
          <Tabs.List>
            <Tabs.Tab value="leave" leftSection={<TbBeach size={16} />}>ข้อมูลพนักงานลางาน</Tabs.Tab>
            <Tabs.Tab value="wfh" leftSection={<TbHome size={16} />}>ข้อมูลพนักงาน WFH</Tabs.Tab>
          </Tabs.List>

          {/* Leave Tab */}
          <Tabs.Panel value="leave" pt="lg">
            <Tabs value={activeLeaveSubTab} onChange={handleLeaveSubTabChange} variant="pills" radius="sm">
              <Tabs.List mb="md">
                {canApprove && <Tabs.Tab value="dashboard">Dashboard - ลางาน</Tabs.Tab>}
                <Tabs.Tab value="history">ข้อมูลการลางาน</Tabs.Tab>
                {canApprove && <Tabs.Tab value="pending">คำขอที่รออนุมัติ</Tabs.Tab>}
              </Tabs.List>

              {canApprove && (
                <Tabs.Panel value="dashboard">
                  <LeaveDashboard />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="history">
                <LeaveRequestList />
              </Tabs.Panel>

              {canApprove && (
                <Tabs.Panel value="pending">
                  <LeaveRequestList pendingOnly />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>

          {/* WFH Tab */}
          <Tabs.Panel value="wfh" pt="lg">
            <Tabs value={activeWfhSubTab} onChange={handleWfhSubTabChange} variant="pills" radius="sm">
              <Tabs.List mb="md">
                {canApprove && <Tabs.Tab value="dashboard">Dashboard - WFH</Tabs.Tab>}
                <Tabs.Tab value="work-report">รายงานการทำงาน</Tabs.Tab>
                <Tabs.Tab value="history">ข้อมูลการ WFH</Tabs.Tab>
                {canApprove && <Tabs.Tab value="pending">คำขอที่รออนุมัติ</Tabs.Tab>}
              </Tabs.List>

              {canApprove && (
                <Tabs.Panel value="dashboard">
                  <WFHDashboard />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="work-report">
                <WFHRequestList showWorkReportOnly />
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <WFHRequestList />
              </Tabs.Panel>

              {canApprove && (
                <Tabs.Panel value="pending">
                  <WFHRequestList pendingOnly />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>
        </Tabs>

        {/* Forms (Conditionally rendered) */}
        {leaveFormOpened && (
          <LeaveRequestForm
            opened={leaveFormOpened}
            onClose={() => setLeaveFormOpened(false)}
          />
        )}
        {wfhFormOpened && (
          <WFHRequestForm
            opened={wfhFormOpened}
            onClose={() => setWfhFormOpened(false)}
          />
        )}
      </Stack>
    </Container>
  )
}
