/**
 * Document Entry Page
 * หน้าคีย์เอกสาร - สำหรับแสดงงานที่ได้รับมอบหมายและจัดการการคีย์เอกสาร
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Container, Stack, Card, Button, Group, Text } from '@mantine/core'
import { useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import { TbRefresh, TbLoader, TbFileText } from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import { getCurrentTaxMonth } from '../utils/taxMonthUtils'
import DocumentEntrySummary from '../components/DocumentEntry/DocumentEntrySummary'
import CompanyList from '../components/DocumentEntry/CompanyList'

export default function DocumentEntry() {
  // ✅ BUG-168: ใช้ useLocation เพื่อ track route changes และใช้ key prop
  const location = useLocation()
  const { user, _hasHydrated } = useAuthStore()
  const queryClient = useQueryClient()
  const currentTaxMonth = getCurrentTaxMonth()

  // ✅ BUG-168: Debug logging เพื่อตรวจสอบว่า component render หรือไม่
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[DocumentEntry] Component mounted/updated:', {
        hasUser: !!user,
        userRole: user?.role,
        employeeId: user?.employee_id,
        _hasHydrated,
        pathname: location.pathname,
        key: location.key,
        timestamp: new Date().toISOString(),
      })
    }
  }, [user, _hasHydrated, location.pathname, location.key])

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Invalidate queries ทั้งหมดที่เกี่ยวข้อง
      await Promise.all([
        queryClient.invalidateQueries(['document-entry-work']),
        queryClient.invalidateQueries(['monthly-tax-data']),
      ])
      
      notifications.show({
        title: 'สำเร็จ',
        message: 'รีเฟรชข้อมูลสำเร็จ',
        color: 'green',
        icon: <TbRefresh size={16} />,
      })
    } catch (error) {
      console.error('Refresh error:', error)
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถรีเฟรชข้อมูลได้',
        color: 'red',
        icon: <TbRefresh size={16} />,
      })
    } finally {
      setIsRefreshing(false)
    }
  }


  return (
    <Container fluid px="xl" py="md">
      <Stack gap="lg">
        {/* Header Section */}
        <Card
          bg="orange"
          radius="lg"
          p="md"
          style={{ borderTopLeftRadius: 'var(--mantine-radius-lg)', borderTopRightRadius: 'var(--mantine-radius-lg)' }}
        >
          <Group justify="space-between" align="center">
            <div>
              <Text size="xl" fw={700} c="white">
                คีย์เอกสาร
              </Text>
              <Text size="sm" c="white" opacity={0.9}>
                งานที่ได้รับมอบหมายสำหรับการคีย์เอกสาร
              </Text>
            </div>
            <Button
              variant="white"
              color="orange"
              leftSection={isRefreshing ? <TbLoader size={18} /> : <TbRefresh size={18} />}
              onClick={handleRefresh}
              disabled={isRefreshing}
              loading={isRefreshing}
              radius="md"
            >
              รีเฟรชข้อมูล
            </Button>
          </Group>
        </Card>

        {/* Summary Section */}
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <TbFileText size={20} />
              <Text size="lg" fw={600}>
                สรุปเอกสารที่รับผิดชอบ
              </Text>
            </Group>
            {/* ✅ BUG-168: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน */}
            <DocumentEntrySummary 
              key={`document-entry-summary-${location?.pathname || 'default'}-${location?.key || 'default'}`}
              year={currentTaxMonth.year} 
              month={currentTaxMonth.month} 
            />
          </Stack>
        </Card>

        {/* Company List Section */}
        <Card withBorder radius="md" p="lg">
          {/* ✅ BUG-168: เพิ่ม key prop เพื่อ force re-render เมื่อ route เปลี่ยน */}
          <CompanyList
            key={`company-list-${location?.pathname || 'default'}-${location?.key || 'default'}`}
            year={currentTaxMonth.year}
            month={currentTaxMonth.month}
          />
        </Card>
      </Stack>
    </Container>
  )
}
