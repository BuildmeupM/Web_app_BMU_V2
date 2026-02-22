/**
 * ClientDetailView — loads and displays client detail with related-data modals
 */
import { useState } from 'react'
import { Card, Group, Button, Alert, Center, Loader } from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'
import { useQuery, useQueryClient } from 'react-query'
import { notifications } from '@mantine/notifications'
import clientsService, { Client, AccountingFees, DbdInfo, AgencyCredentials } from '../../services/clientsService'
import ClientDetail from '../Client/ClientDetail'
import MonthlyFeesForm from '../Client/MonthlyFeesForm'
import DbdInfoForm from '../Client/DbdInfoForm'
import AgencyCredentialsForm from '../Client/AgencyCredentialsForm'

interface ClientDetailViewProps {
  build: string
  onBack?: () => void
  onEdit: (client: Client) => void
}

export default function ClientDetailView({ build, onBack, onEdit }: ClientDetailViewProps) {
  const queryClient = useQueryClient()
  const { data: client, isLoading, error } = useQuery(
    ['client', build],
    () => clientsService.getByBuild(build),
    { enabled: !!build }
  )

  // Modal states
  const [monthlyFeesOpened, setMonthlyFeesOpened] = useState(false)
  const [dbdOpened, setDbdOpened] = useState(false)
  const [credentialsOpened, setCredentialsOpened] = useState(false)

  // Save handler for monthly fees
  const handleSaveMonthlyFees = async (data: AccountingFees) => {
    try {
      // Merge with existing accounting_fees (preserve peak_code, dates)
      const existingFees = client?.accounting_fees || {}
      const merged = { ...existingFees, ...data }
      await clientsService.update(build, { accounting_fees: merged })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกค่าทำบัญชีรายเดือนเรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setMonthlyFeesOpened(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'response' in err ? (err as Record<string, Record<string, Record<string, string>>>).response?.data?.message : undefined)
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  // Save handler for DBD info
  const handleSaveDbdInfo = async (data: DbdInfo) => {
    try {
      await clientsService.update(build, { dbd_info: data })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกข้อมูล DBD เรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setDbdOpened(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'response' in err ? (err as Record<string, Record<string, Record<string, string>>>).response?.data?.message : undefined)
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  // Save handler for credentials
  const handleSaveCredentials = async (data: AgencyCredentials) => {
    try {
      await clientsService.update(build, { agency_credentials: data })
      notifications.show({ title: 'บันทึกสำเร็จ', message: 'บันทึกรหัสผู้ใช้เรียบร้อย', color: 'green' })
      queryClient.invalidateQueries(['client', build])
      setCredentialsOpened(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'response' in err ? (err as Record<string, Record<string, Record<string, string>>>).response?.data?.message : undefined)
      notifications.show({ title: 'เกิดข้อผิดพลาด', message: message || 'ไม่สามารถบันทึกได้', color: 'red' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <Center py="xl"><Loader /></Center>
      </Card>
    )
  }

  if (error || !client) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <Alert icon={<TbAlertCircle size={16} />} color="red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า
        </Alert>
      </Card>
    )
  }

  return (
    <>
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>← กลับไปรายชื่อ</Button>
          </Group>
        )}
        <ClientDetail
          client={client}
          onEdit={() => onEdit(client)}
          onEditMonthlyFees={() => setMonthlyFeesOpened(true)}
          onEditDbdInfo={() => setDbdOpened(true)}
          onEditCredentials={() => setCredentialsOpened(true)}
        />
      </Card>

      {/* Monthly Fees Modal */}
      <MonthlyFeesForm
        opened={monthlyFeesOpened}
        onClose={() => setMonthlyFeesOpened(false)}
        onSubmit={handleSaveMonthlyFees}
        data={client.accounting_fees}
        build={build}
      />

      {/* DBD Info Modal */}
      <DbdInfoForm
        opened={dbdOpened}
        onClose={() => setDbdOpened(false)}
        onSubmit={handleSaveDbdInfo}
        data={client.dbd_info}
        build={build}
      />

      {/* Credentials Modal */}
      <AgencyCredentialsForm
        opened={credentialsOpened}
        onClose={() => setCredentialsOpened(false)}
        onSubmit={handleSaveCredentials}
        data={client.agency_credentials}
        build={build}
      />
    </>
  )
}
