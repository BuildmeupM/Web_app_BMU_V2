import { Container, Title, Stack, Button, Group, TextInput } from '@mantine/core'
import { TbPlus, TbSearch } from 'react-icons/tb'

export default function SalaryAdvance() {
  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={1}>ขอเบิกเงินเดือน</Title>
          <Button leftSection={<TbPlus size={18} />} radius="lg">
            ขอเบิกเงินเดือน
          </Button>
        </Group>

        <Group>
          <TextInput
            placeholder="ค้นหา..."
            leftSection={<TbSearch size={16} />}
            style={{ flex: 1 }}
            radius="lg"
          />
        </Group>

        {/* TODO: Add salary advance table */}
        <div>ตารางการเบิกเงินเดือน (กำลังพัฒนา)</div>
      </Stack>
    </Container>
  )
}
