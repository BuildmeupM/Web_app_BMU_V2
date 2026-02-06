import { Container, Title, Stack, Group, TextInput } from '@mantine/core'
import { TbSearch } from 'react-icons/tb'

export default function OfficeAttendance() {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <Title order={1}>ข้อมูลเข้าออฟฟิศ</Title>

        <Group>
          <TextInput
            placeholder="ค้นหา..."
            leftSection={<TbSearch size={16} />}
            style={{ flex: 1 }}
            radius="lg"
          />
        </Group>

        {/* TODO: Add attendance table */}
        <div>ตารางข้อมูลเข้าออฟฟิศ (กำลังพัฒนา)</div>
      </Stack>
    </Container>
  )
}
