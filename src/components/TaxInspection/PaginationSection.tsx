import { Group, Text, Select, Button, Stack } from '@mantine/core'

interface PaginationSectionProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

export default function PaginationSection({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationSectionProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <Group justify="space-between" mt="lg">
      {/* Left: Items per page selector */}
      <Group gap="xs">
        <Text size="sm">แสดง</Text>
        <Select
          value={itemsPerPage.toString()}
          onChange={(value) => onItemsPerPageChange(Number(value))}
          data={['10', '20', '50', '100']}
          style={{ width: 80 }}
          size="sm"
        />
        <Text size="sm">รายการต่อหน้า</Text>
        <Text size="sm" c="dimmed">
          แสดง {startItem}-{endItem} จาก {totalItems} รายการ
        </Text>
      </Group>

      {/* Right: Page navigation */}
      <Group gap="xs">
        <Button
          variant="light"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          radius="lg"
        >
          &lt; ก่อนหน้า
        </Button>

        {renderPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <Text key={`ellipsis-${index}`} size="sm" c="dimmed" px="xs">
                ...
              </Text>
            )
          }

          const pageNum = page as number
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'filled' : 'light'}
              color={currentPage === pageNum ? 'orange' : 'gray'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              radius="lg"
            >
              {pageNum}
            </Button>
          )
        })}

        <Button
          variant="light"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          radius="lg"
        >
          ถัดไป &gt;
        </Button>
      </Group>
    </Group>
  )
}
