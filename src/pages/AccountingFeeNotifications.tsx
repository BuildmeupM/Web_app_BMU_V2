/**
 * Accounting Fee Notifications Page
 * รับแจ้งเรื่องค่าทำบัญชี — ระบบจดบันทึก Notes/Memo แบ่งตามหัวข้อ
 */

import { useState } from 'react'
import {
  Container,
  Title,
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Box,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  SimpleGrid,
  ActionIcon,
  Pagination,
  Alert,
  Divider,
  Menu,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  TbBellRinging,
  TbPlus,
  TbEdit,
  TbTrash,
  TbSearch,
  TbFilter,
  TbUserOff,
  TbCurrencyBaht,
  TbMapPin,
  TbUserEdit,
  TbUserCheck,
  TbNote,
  TbCalendar,
  TbDots,
  TbFileSpreadsheet,
} from 'react-icons/tb'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import api from '../services/api'
import accountingFeeNotesService, {
  type FeeNoteCategory,
  type AccountingFeeNote,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../services/accountingFeeNotesService'

dayjs.locale('th')

/** Category icon mapping */
const CategoryIcons: Record<FeeNoteCategory, React.ElementType> = {
  customer_cancel: TbUserOff,
  fee_adjustment: TbCurrencyBaht,
  address_change: TbMapPin,
  name_change: TbUserEdit,
  customer_return: TbUserCheck,
}

/** Category select data */
const CATEGORY_SELECT_DATA = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/** Month select options */
const MONTH_OPTIONS = [
  { value: '', label: 'ทุกเดือน' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: dayjs().month(i).format('MMMM'),
  })),
]

export default function AccountingFeeNotifications() {
  const queryClient = useQueryClient()

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>(String(dayjs().month() + 1))
  const [filterYear] = useState<number>(dayjs().year())
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Modal state
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingNote, setEditingNote] = useState<AccountingFeeNote | null>(null)
  const [formCategory, setFormCategory] = useState<string>('')
  const [formCustomerName, setFormCustomerName] = useState('')
  const [formNote, setFormNote] = useState('')

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)

  // Queries
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery(
    ['accounting-fee-notes-summary', filterYear, filterMonth],
    () =>
      accountingFeeNotesService.summary({
        year: filterYear,
        month: filterMonth ? parseInt(filterMonth) : undefined,
      }),
    { staleTime: 30 * 1000 }
  )

  const { data: notesData, isLoading: isLoadingNotes } = useQuery(
    ['accounting-fee-notes', page, filterCategory, filterYear, filterMonth, searchQuery],
    () =>
      accountingFeeNotesService.list({
        page,
        limit: 15,
        category: filterCategory ? (filterCategory as FeeNoteCategory) : undefined,
        year: filterYear,
        month: filterMonth ? parseInt(filterMonth) : undefined,
        search: searchQuery || undefined,
      }),
    { staleTime: 30 * 1000, keepPreviousData: true }
  )

  // Mutations
  const createMutation = useMutation(accountingFeeNotesService.create, {
    onSuccess: async () => {
      await queryClient.invalidateQueries('accounting-fee-notes')
      await queryClient.invalidateQueries('accounting-fee-notes-summary')
      notifications.show({ title: 'สำเร็จ', message: 'สร้างโน๊ตสำเร็จ', color: 'green' })
      closeModal()
      resetForm()
    },
    onError: () => {
      notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถสร้างโน๊ตได้', color: 'red' })
    },
  })

  const updateMutation = useMutation(
    (data: { id: string; body: { category?: FeeNoteCategory; customer_name?: string; note?: string } }) =>
      accountingFeeNotesService.update(data.id, data.body),
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries('accounting-fee-notes')
        await queryClient.invalidateQueries('accounting-fee-notes-summary')
        notifications.show({ title: 'สำเร็จ', message: 'อัปเดตโน๊ตสำเร็จ', color: 'green' })
        closeModal()
        resetForm()
      },
      onError: () => {
        notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถอัปเดตโน๊ตได้', color: 'red' })
      },
    }
  )

  const deleteMutation = useMutation(accountingFeeNotesService.remove, {
    onSuccess: async () => {
      await queryClient.invalidateQueries('accounting-fee-notes')
      await queryClient.invalidateQueries('accounting-fee-notes-summary')
      notifications.show({ title: 'สำเร็จ', message: 'ลบโน๊ตสำเร็จ', color: 'green' })
      closeDelete()
      setDeleteId(null)
    },
    onError: () => {
      notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถลบโน๊ตได้', color: 'red' })
    },
  })

  // Form helpers
  const resetForm = () => {
    setEditingNote(null)
    setFormCategory('')
    setFormCustomerName('')
    setFormNote('')
  }

  const handleOpenCreate = () => {
    resetForm()
    openModal()
  }

  const handleOpenEdit = (note: AccountingFeeNote) => {
    setEditingNote(note)
    setFormCategory(note.category)
    setFormCustomerName(note.customer_name)
    setFormNote(note.note)
    openModal()
  }

  const handleSubmit = () => {
    if (!formCategory || !formCustomerName.trim() || !formNote.trim()) {
      notifications.show({ title: 'กรุณากรอกข้อมูลให้ครบ', message: 'ต้องระบุหัวข้อ ชื่อลูกค้า และเนื้อหาโน๊ต', color: 'orange' })
      return
    }

    if (editingNote) {
      updateMutation.mutate({
        id: editingNote.id,
        body: {
          category: formCategory as FeeNoteCategory,
          customer_name: formCustomerName,
          note: formNote,
        },
      })
    } else {
      createMutation.mutate({
        category: formCategory as FeeNoteCategory,
        customer_name: formCustomerName,
        note: formNote,
      })
    }
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    openDelete()
  }

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId)
    }
  }

  const notes = notesData?.data || []
  const totalPages = notesData?.pagination?.totalPages || 1
  const summaryCategories = summaryData?.data?.categories || []
  const summaryTotal = summaryData?.data?.total || 0

  // Export to Excel
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params: Record<string, string | number> = { year: filterYear }
      if (filterMonth) params.month = parseInt(filterMonth)
      if (filterCategory) params.category = filterCategory

      const response = await api.get('/accounting-fee-notes/export', {
        params,
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const monthLabel = filterMonth ? `_${dayjs().month(parseInt(filterMonth) - 1).format('MMMM')}` : ''
      link.download = `สรุปแจ้งเรื่องค่าทำบัญชี_${filterYear}${monthLabel}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      notifications.show({ title: 'สำเร็จ', message: 'ส่งออก Excel เรียบร้อย', color: 'green' })
    } catch {
      notifications.show({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถส่งออก Excel ได้', color: 'red' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Card
          withBorder
          radius="xl"
          p="lg"
          style={{
            background: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
            border: 'none',
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TbBellRinging size={32} color="white" />
              </Box>
              <div>
                <Title order={2} c="white" fw={700}>
                  รับแจ้งเรื่องค่าทำบัญชี
                </Title>
                <Text c="white" size="sm" style={{ opacity: 0.85 }}>
                  ระบบจดบันทึกและจัดการเรื่องเกี่ยวกับค่าทำบัญชี
                </Text>
              </div>
            </Group>
            <Group gap="sm">
              <Button
                leftSection={<TbFileSpreadsheet size={18} />}
                variant="white"
                color="green"
                radius="xl"
                size="md"
                onClick={handleExport}
                loading={isExporting}
              >
                ส่งออก Excel
              </Button>
              <Button
                leftSection={<TbPlus size={18} />}
                variant="white"
                color="orange"
                radius="xl"
                size="md"
                onClick={handleOpenCreate}
              >
                เพิ่มโน๊ตใหม่
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Dashboard Summary Cards */}
        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <TbCalendar size={20} />
              <Title order={4}>สรุปรายเดือน</Title>
              <Badge size="lg" variant="light" color="orange">
                ทั้งหมด {summaryTotal} รายการ
              </Badge>
            </Group>
            <Select
              value={filterMonth}
              onChange={(v) => {
                setFilterMonth(v || '')
                setPage(1)
              }}
              data={MONTH_OPTIONS}
              style={{ width: 160 }}
              size="sm"
            />
          </Group>

          {isLoadingSummary ? (
            <Text c="dimmed">กำลังโหลดข้อมูลสรุป...</Text>
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
              {summaryCategories.map((item) => {
                const IconComponent = CategoryIcons[item.category]
                const color = CATEGORY_COLORS[item.category]
                return (
                  <Card
                    key={item.category}
                    withBorder
                    radius="md"
                    p="md"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid var(--mantine-color-${color}-5)`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.currentTarget.style.transform = ''
                      e.currentTarget.style.boxShadow = ''
                    }}
                    onClick={() => {
                      setFilterCategory(
                        filterCategory === item.category ? '' : item.category
                      )
                      setPage(1)
                    }}
                  >
                    <Group gap="xs" mb={4}>
                      <IconComponent size={20} color={`var(--mantine-color-${color}-6)`} />
                      <Text size="xs" fw={600} c={color}>
                        {item.label}
                      </Text>
                    </Group>
                    <Text fw={700} size="xl">
                      {item.count}
                    </Text>
                  </Card>
                )
              })}
            </SimpleGrid>
          )}
        </Card>

        {/* Filters + Notes List */}
        <Card withBorder radius="lg" p="lg">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <TbNote size={20} />
              <Title order={4}>รายการโน๊ตทั้งหมด</Title>
            </Group>
            <Group gap="sm">
              <TextInput
                placeholder="ค้นหาชื่อลูกค้า / เนื้อหา..."
                leftSection={<TbSearch size={16} />}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.currentTarget.value)
                  setPage(1)
                }}
                style={{ width: 260 }}
                size="sm"
              />
              <Select
                placeholder="กรองหัวข้อ"
                leftSection={<TbFilter size={16} />}
                value={filterCategory}
                onChange={(v) => {
                  setFilterCategory(v || '')
                  setPage(1)
                }}
                data={[{ value: '', label: 'ทุกหัวข้อ' }, ...CATEGORY_SELECT_DATA]}
                style={{ width: 200 }}
                size="sm"
                clearable
              />
            </Group>
          </Group>

          <Divider mb="md" />

          {/* Notes List */}
          {isLoadingNotes ? (
            <Text c="dimmed" ta="center" py="xl">
              กำลังโหลดข้อมูล...
            </Text>
          ) : notes.length === 0 ? (
            <Alert color="gray" variant="light" radius="md">
              <Text ta="center" c="dimmed">
                {searchQuery || filterCategory
                  ? 'ไม่พบโน๊ตที่ตรงกับตัวกรอง'
                  : 'ยังไม่มีโน๊ต กดปุ่ม "เพิ่มโน๊ตใหม่" เพื่อเริ่มต้น'}
              </Text>
            </Alert>
          ) : (
            <Stack gap="sm">
              {notes.map((note) => {
                const IconComponent = CategoryIcons[note.category]
                const color = CATEGORY_COLORS[note.category]
                const creatorName = note.created_by_nick_name
                  ? `${note.created_by_name} (${note.created_by_nick_name})`
                  : note.created_by_name || note.created_by_username || 'ไม่ทราบ'

                return (
                  <Card
                    key={note.id}
                    withBorder
                    radius="md"
                    p="md"
                    style={{
                      borderLeft: `4px solid var(--mantine-color-${color}-5)`,
                    }}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm" align="flex-start" style={{ flex: 1 }}>
                        <Box mt={2}>
                          <IconComponent size={22} color={`var(--mantine-color-${color}-6)`} />
                        </Box>
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" mb={4}>
                            <Badge size="sm" color={color} variant="light">
                              {CATEGORY_LABELS[note.category]}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              •
                            </Text>
                            <Text size="xs" c="dimmed">
                              {dayjs(note.created_at).format('D MMM YYYY HH:mm')}
                            </Text>
                          </Group>
                          <Text fw={600} size="sm" mb={4}>
                            {note.customer_name}
                          </Text>
                          <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                            {note.note}
                          </Text>
                          <Text size="xs" c="dimmed" mt={6}>
                            โดย: {creatorName}
                            {note.updated_at !== note.created_at && (
                              <> • แก้ไขล่าสุด: {dayjs(note.updated_at).format('D MMM YYYY HH:mm')}</>
                            )}
                          </Text>
                        </div>
                      </Group>

                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm">
                            <TbDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<TbEdit size={14} />}
                            onClick={() => handleOpenEdit(note)}
                          >
                            แก้ไข
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<TbTrash size={14} />}
                            color="red"
                            onClick={() => handleDelete(note.id)}
                          >
                            ลบ
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Card>
                )
              })}
            </Stack>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Group justify="center" mt="lg">
              <Pagination
                value={page}
                onChange={setPage}
                total={totalPages}
                size="sm"
                radius="md"
              />
            </Group>
          )}
        </Card>
      </Stack>

      {/* Create / Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          closeModal()
          resetForm()
        }}
        title={
          <Group gap="xs">
            <TbNote size={20} />
            <Text fw={600}>{editingNote ? 'แก้ไขโน๊ต' : 'เพิ่มโน๊ตใหม่'}</Text>
          </Group>
        }
        size="md"
        radius="lg"
      >
        <Stack gap="md">
          <Select
            label="หัวข้อ"
            placeholder="เลือกหัวข้อ"
            data={CATEGORY_SELECT_DATA}
            value={formCategory}
            onChange={(v) => setFormCategory(v || '')}
            required
          />
          <TextInput
            label="ชื่อลูกค้า"
            placeholder="ระบุชื่อลูกค้า"
            value={formCustomerName}
            onChange={(e) => setFormCustomerName(e.currentTarget.value)}
            required
          />
          <Textarea
            label="เนื้อหาโน๊ต"
            placeholder="ระบุรายละเอียด..."
            value={formNote}
            onChange={(e) => setFormNote(e.currentTarget.value)}
            minRows={4}
            autosize
            required
          />
          <Group justify="flex-end" mt="sm">
            <Button
              variant="light"
              onClick={() => {
                closeModal()
                resetForm()
              }}
            >
              ยกเลิก
            </Button>
            <Button
              color="orange"
              onClick={handleSubmit}
              loading={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingNote ? 'บันทึกการแก้ไข' : 'สร้างโน๊ต'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title={
          <Group gap="xs">
            <TbTrash size={20} color="red" />
            <Text fw={600} c="red">
              ยืนยันการลบ
            </Text>
          </Group>
        }
        size="sm"
        radius="lg"
      >
        <Text mb="lg">คุณต้องการลบโน๊ตนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</Text>
        <Group justify="flex-end">
          <Button variant="light" onClick={closeDelete}>
            ยกเลิก
          </Button>
          <Button color="red" onClick={confirmDelete} loading={deleteMutation.isLoading}>
            ลบ
          </Button>
        </Group>
      </Modal>
    </Container>
  )
}
