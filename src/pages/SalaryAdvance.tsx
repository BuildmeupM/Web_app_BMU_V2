/**
 * Salary Advance & Document Request Page
 * หน้าขอเบิกเงินเดือนล่วงหน้า และขอเอกสาร (หนังสือรับรองการทำงาน / หนังสือรับรองเงินเดือน)
 */

import { useState } from 'react'
import { Container, Title, Stack, Tabs, Group, Button } from '@mantine/core'
import { TbCash, TbFileDescription, TbPlus } from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import SalaryAdvanceDashboard from '../components/SalaryAdvance/SalaryAdvanceDashboard'
import SalaryAdvanceRequestForm from '../components/SalaryAdvance/SalaryAdvanceRequestForm'
import SalaryAdvanceRequestList from '../components/SalaryAdvance/SalaryAdvanceRequestList'
import DocumentRequestForm from '../components/SalaryAdvance/DocumentRequestForm'
import DocumentRequestList from '../components/SalaryAdvance/DocumentRequestList'

export default function SalaryAdvance() {
  const [activeMainTab, setActiveMainTab] = useState<string>('salary-advance')
  const [salaryFormOpened, setSalaryFormOpened] = useState(false)
  const [docFormOpened, setDocFormOpened] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'hr'

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <Container fluid>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>ขอเบิกเงินเดือน / ขอเอกสาร</Title>
          <Group>
            {activeMainTab === 'salary-advance' && (
              <Button
                leftSection={<TbCash size={18} />}
                radius="lg"
                onClick={() => setSalaryFormOpened(true)}
              >
                ขอเบิกเงินเดือน
              </Button>
            )}
            {activeMainTab === 'document-request' && (
              <Button
                leftSection={<TbFileDescription size={18} />}
                radius="lg"
                color="violet"
                onClick={() => setDocFormOpened(true)}
              >
                ขอเอกสาร
              </Button>
            )}
          </Group>
        </Group>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onChange={(value) => setActiveMainTab(value || 'salary-advance')}>
          <Tabs.List>
            <Tabs.Tab value="salary-advance" leftSection={<TbCash size={16} />}>
              ขอเบิกเงินเดือน
            </Tabs.Tab>
            <Tabs.Tab value="document-request" leftSection={<TbFileDescription size={16} />}>
              ขอเอกสาร
            </Tabs.Tab>
          </Tabs.List>

          {/* Salary Advance Tab */}
          <Tabs.Panel value="salary-advance" pt="lg">
            <Tabs defaultValue={isAdmin ? 'dashboard' : 'history'}>
              <Tabs.List>
                {isAdmin && <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>}
                <Tabs.Tab value="history">ประวัติการขอเบิก</Tabs.Tab>
                {isAdmin && <Tabs.Tab value="pending">รออนุมัติ</Tabs.Tab>}
              </Tabs.List>

              {isAdmin && (
                <Tabs.Panel value="dashboard" pt="lg">
                  <SalaryAdvanceDashboard />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="history" pt="lg">
                <SalaryAdvanceRequestList refreshTrigger={refreshKey} />
              </Tabs.Panel>

              {isAdmin && (
                <Tabs.Panel value="pending" pt="lg">
                  <SalaryAdvanceRequestList pendingOnly refreshTrigger={refreshKey} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>

          {/* Document Request Tab */}
          <Tabs.Panel value="document-request" pt="lg">
            <Tabs defaultValue="history">
              <Tabs.List>
                <Tabs.Tab value="history">ประวัติการขอเอกสาร</Tabs.Tab>
                {isAdmin && <Tabs.Tab value="pending">รออนุมัติ</Tabs.Tab>}
              </Tabs.List>

              <Tabs.Panel value="history" pt="lg">
                <DocumentRequestList refreshTrigger={refreshKey} />
              </Tabs.Panel>

              {isAdmin && (
                <Tabs.Panel value="pending" pt="lg">
                  <DocumentRequestList pendingOnly refreshTrigger={refreshKey} />
                </Tabs.Panel>
              )}
            </Tabs>
          </Tabs.Panel>
        </Tabs>

        {/* Forms */}
        <SalaryAdvanceRequestForm
          opened={salaryFormOpened}
          onClose={() => setSalaryFormOpened(false)}
          onSuccess={handleSuccess}
        />
        <DocumentRequestForm
          opened={docFormOpened}
          onClose={() => setDocFormOpened(false)}
          onSuccess={handleSuccess}
        />
      </Stack>
    </Container>
  )
}
