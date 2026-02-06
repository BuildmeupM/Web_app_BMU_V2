import { useState } from 'react'
import { Container, Stack, Group, Text, Card, Tabs, Button, TextInput } from '@mantine/core'
import { TbShoppingCart, TbList, TbPackage, TbHistory, TbChartLine, TbPlus, TbSearch } from 'react-icons/tb'
import AvailableJobsTable from '../components/AccountingMarketplace/AvailableJobsTable'
import MyListingsTable from '../components/AccountingMarketplace/MyListingsTable'
import PurchasedJobsTable from '../components/AccountingMarketplace/PurchasedJobsTable'
import TransactionHistoryTable from '../components/AccountingMarketplace/TransactionHistoryTable'
import MonthlyIncomeTable from '../components/AccountingMarketplace/MonthlyIncomeTable'
import CreateListingModal from '../components/AccountingMarketplace/CreateListingModal'
import { getCurrentTaxMonth } from '../utils/taxMonthUtils'

export default function AccountingMarketplace() {
  const [activeTab, setActiveTab] = useState<string | null>('available')
  const [createModalOpened, setCreateModalOpened] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const currentTaxMonth = getCurrentTaxMonth()

  return (
    <Container fluid px="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Card withBorder radius="md" p="md" style={{ backgroundColor: '#fff3e0', borderColor: '#ff6b35', borderWidth: '2px' }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <TbShoppingCart size={24} color="#ff6b35" />
              <Text size="xl" fw={700} c="orange">
                ตลาดกลางผู้ทำบัญชี
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              เดือนภาษีปัจจุบัน: {currentTaxMonth.month}/{currentTaxMonth.year}
            </Text>
          </Group>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="available" leftSection={<TbShoppingCart size={16} />}>
              ตลาดกลาง
            </Tabs.Tab>
            <Tabs.Tab value="my-listings" leftSection={<TbList size={16} />}>
              งานที่ฉันขาย
            </Tabs.Tab>
            <Tabs.Tab value="purchased" leftSection={<TbPackage size={16} />}>
              งานที่ฉันซื้อ
            </Tabs.Tab>
            <Tabs.Tab value="history" leftSection={<TbHistory size={16} />}>
              ประวัติการซื้อขาย
            </Tabs.Tab>
            <Tabs.Tab value="income" leftSection={<TbChartLine size={16} />}>
              รายได้รายเดือน
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab: ตลาดกลาง */}
          <Tabs.Panel value="available" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="ค้นหาด้วย Build หรือชื่อบริษัท"
                  leftSection={<TbSearch size={16} />}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 400 }}
                />
              </Group>
              <AvailableJobsTable search={searchValue} />
            </Stack>
          </Tabs.Panel>

          {/* Tab: งานที่ฉันขาย */}
          <Tabs.Panel value="my-listings" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="md" style={{ flex: 1 }}>
                  <TextInput
                    placeholder="ค้นหาด้วย Build หรือชื่อบริษัท"
                    leftSection={<TbSearch size={16} />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.currentTarget.value)}
                    style={{ flex: 1, maxWidth: 300 }}
                  />
                </Group>
                <Button
                  color="orange"
                  leftSection={<TbPlus size={16} />}
                  onClick={() => setCreateModalOpened(true)}
                >
                  ขายงาน
                </Button>
              </Group>
              <MyListingsTable status={statusFilter} search={searchValue} />
            </Stack>
          </Tabs.Panel>

          {/* Tab: งานที่ฉันซื้อ */}
          <Tabs.Panel value="purchased" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <TextInput
                  placeholder="ค้นหาด้วย Build หรือชื่อบริษัท"
                  leftSection={<TbSearch size={16} />}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 400 }}
                />
              </Group>
              <PurchasedJobsTable search={searchValue} />
            </Stack>
          </Tabs.Panel>

          {/* Tab: ประวัติการซื้อขาย */}
          <Tabs.Panel value="history" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="md" style={{ flex: 1 }}>
                  <TextInput
                    placeholder="ค้นหาด้วย Build หรือชื่อบริษัท"
                    leftSection={<TbSearch size={16} />}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.currentTarget.value)}
                    style={{ flex: 1, maxWidth: 300 }}
                  />
                </Group>
              </Group>
              <TransactionHistoryTable type={typeFilter as 'sell' | 'buy' | undefined} search={searchValue} />
            </Stack>
          </Tabs.Panel>

          {/* Tab: รายได้รายเดือน */}
          <Tabs.Panel value="income" pt="md">
            <MonthlyIncomeTable />
          </Tabs.Panel>
        </Tabs>

        {/* Create Listing Modal */}
        <CreateListingModal opened={createModalOpened} onClose={() => setCreateModalOpened(false)} />
      </Stack>
    </Container>
  )
}
