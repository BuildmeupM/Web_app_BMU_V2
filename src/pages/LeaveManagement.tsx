/**
 * Leave Management Page
 * หน้าจัดการการลาและ Work from Home (WFH)
 */

import { useState } from 'react'
import { Container, Title, Stack, Tabs, Group, Button } from '@mantine/core'
import { TbPlus } from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import LeaveRequestList from '../components/Leave/LeaveRequestList'
import LeaveRequestForm from '../components/Leave/LeaveRequestForm'
import LeaveDashboard from '../components/Leave/LeaveDashboard'
import WFHRequestList from '../components/Leave/WFHRequestList'
import WFHRequestForm from '../components/Leave/WFHRequestForm'
import WFHDashboard from '../components/Leave/WFHDashboard'

export default function LeaveManagement() {
  const [activeMainTab, setActiveMainTab] = useState<string>('leave')
  const [leaveFormOpened, setLeaveFormOpened] = useState(false)
  const [wfhFormOpened, setWfhFormOpened] = useState(false)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'

  return (
    <Container fluid>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>ลางาน/WFH</Title>
          <Group>
            {activeMainTab === 'leave' && (
              <Button
                leftSection={<TbPlus size={18} />}
                radius="lg"
                onClick={() => setLeaveFormOpened(true)}
              >
                ขอลา
              </Button>
            )}
            {activeMainTab === 'wfh' && (
              <Button
                leftSection={<TbPlus size={18} />}
                radius="lg"
                onClick={() => setWfhFormOpened(true)}
              >
                ขอ WFH
              </Button>
            )}
          </Group>
        </Group>

        {/* Main Tabs: Leave / WFH */}
        <Tabs value={activeMainTab} onChange={(value) => setActiveMainTab(value || 'leave')}>
          <Tabs.List>
            <Tabs.Tab value="leave">ข้อมูลพนักงานลางาน</Tabs.Tab>
            <Tabs.Tab value="wfh">ข้อมูลพนักงาน WFH</Tabs.Tab>
          </Tabs.List>

          {/* Leave Tab */}
          <Tabs.Panel value="leave" pt="lg">
            <Tabs defaultValue={isAdmin ? "dashboard" : "history"}>
              <Tabs.List>
                {isAdmin && <Tabs.Tab value="dashboard">Dashboard - ลางาน</Tabs.Tab>}
                <Tabs.Tab value="history">ข้อมูลการลางาน</Tabs.Tab>
                {isAdmin && <Tabs.Tab value="pending">ข้อมูลการขอลางาน</Tabs.Tab>}
              </Tabs.List>

              {isAdmin && (
                <Tabs.Panel value="dashboard" pt="lg">
                  <LeaveDashboard />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="history" pt="lg">
                <LeaveRequestList />
              </Tabs.Panel>

              {isAdmin && (
                <Tabs.Panel value="pending" pt="lg">
                  <LeaveRequestList pendingOnly />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>

          {/* WFH Tab */}
          <Tabs.Panel value="wfh" pt="lg">
            <Tabs defaultValue={isAdmin ? "dashboard" : "work-report"}>
              <Tabs.List>
                {isAdmin && <Tabs.Tab value="dashboard">Dashboard - WFH</Tabs.Tab>}
                <Tabs.Tab value="work-report">รายงานการทำงาน</Tabs.Tab>
                <Tabs.Tab value="history">ข้อมูลการ WFH</Tabs.Tab>
                {isAdmin && <Tabs.Tab value="pending">ข้อมูลการขอ WFH</Tabs.Tab>}
              </Tabs.List>

              {isAdmin && (
                <Tabs.Panel value="dashboard" pt="lg">
                  <WFHDashboard />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="work-report" pt="lg">
                <WFHRequestList showWorkReportOnly />
              </Tabs.Panel>

              <Tabs.Panel value="history" pt="lg">
                <WFHRequestList />
              </Tabs.Panel>

              {isAdmin && (
                <Tabs.Panel value="pending" pt="lg">
                  <WFHRequestList pendingOnly />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>
        </Tabs>

        {/* Forms */}
        <LeaveRequestForm
          opened={leaveFormOpened}
          onClose={() => setLeaveFormOpened(false)}
        />
        <WFHRequestForm
          opened={wfhFormOpened}
          onClose={() => setWfhFormOpened(false)}
        />
      </Stack>
    </Container>
  )
}
