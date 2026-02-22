import { Box, Text } from '@mantine/core'
import { formatCurrency } from './constants'

export default function MonthCard({ label, value }: { label: string; value: number | null }) {
    const hasValue = value !== null && value !== undefined
    return (
        <Box
            style={{
                backgroundColor: hasValue ? '#e8f5e9' : '#f5f5f5',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
                border: hasValue ? '1px solid #c8e6c9' : '1px solid #e0e0e0',
                minWidth: 0,
            }}
        >
            <Text size="xs" c="dimmed" fw={500}>{label}</Text>
            <Text
                size="sm"
                fw={hasValue ? 700 : 400}
                c={hasValue ? 'dark' : 'dimmed'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
            >
                {hasValue ? formatCurrency(value) : '-'}
            </Text>
        </Box>
    )
}
