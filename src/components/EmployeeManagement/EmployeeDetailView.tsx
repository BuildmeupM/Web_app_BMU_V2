import { Card, Group, Button, Center, Loader, Alert } from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'
import { useQuery } from 'react-query'
import { employeeService } from '../../services/employeeService'
import EmployeeDetail from '../Employee/EmployeeDetail'

// Component to load and display employee detail
export default function EmployeeDetailView({
  employeeId,
  onBack,
  onEdit,
}: {
  employeeId: string
  onBack?: () => void
  onEdit: () => void
}) {
  const { data: employee, isLoading, error } = useQuery(
    ['employee', employeeId],
    () => employeeService.getById(employeeId),
    {
      enabled: !!employeeId,
    }
  )

  if (isLoading) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>
              ← กลับไปรายชื่อ
            </Button>
          </Group>
        )}
        <Center py="xl">
          <Loader />
        </Center>
      </Card>
    )
  }

  if (error || !employee) {
    return (
      <Card>
        {onBack && (
          <Group justify="space-between" mb="md">
            <Button variant="subtle" onClick={onBack}>
              ← กลับไปรายชื่อ
            </Button>
          </Group>
        )}
        <Alert icon={<TbAlertCircle size={16} />} color="red">
          เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน
        </Alert>
      </Card>
    )
  }

  return (
    <Card>
      {onBack && (
        <Group justify="space-between" mb="md">
          <Button variant="subtle" onClick={onBack}>
            ← กลับไปรายชื่อ
          </Button>
        </Group>
      )}
      <EmployeeDetail employee={employee} onEdit={onEdit} />
    </Card>
  )
}
