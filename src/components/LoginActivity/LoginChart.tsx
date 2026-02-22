/**
 * LoginChart — SVG bar chart showing login trends (7 days)
 */

import { Card, Group, Text, Skeleton, Box } from '@mantine/core'
import type { ChartDataPoint } from '../../services/loginActivityService'

export default function LoginChart({ data, loading }: { data: ChartDataPoint[]; loading: boolean }) {
    if (loading) {
        return (
            <Card padding="lg" radius="xl" withBorder>
                <Text size="sm" fw={600} mb="md">
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Skeleton height={200} />
            </Card>
        )
    }

    if (!data || data.length === 0) {
        return (
            <Card padding="lg" radius="xl" withBorder>
                <Text size="sm" fw={600} mb="md">
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Box style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text c="dimmed" size="sm">
                        ไม่มีข้อมูล
                    </Text>
                </Box>
            </Card>
        )
    }

    const maxVal = Math.max(...data.map((d) => d.total_count), 1)
    const chartHeight = 200
    const paddingX = 40
    const paddingTop = 10
    const paddingBottom = 30
    const viewBoxW = 500
    const viewBoxH = chartHeight + paddingTop + paddingBottom
    const barAreaW = viewBoxW - paddingX * 2
    const barGroupW = barAreaW / data.length
    const barW = barGroupW * 0.35
    const gapBetween = 3

    return (
        <Card padding="lg" radius="xl" withBorder>
            <Group justify="space-between" mb="md">
                <Text size="sm" fw={600}>
                    แนวโน้มการเข้าสู่ระบบ (7 วัน)
                </Text>
                <Group gap="md">
                    <Group gap={4}>
                        <Box style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--mantine-color-green-6)' }} />
                        <Text size="xs" c="dimmed">สำเร็จ</Text>
                    </Group>
                    <Group gap={4}>
                        <Box style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--mantine-color-red-5)' }} />
                        <Text size="xs" c="dimmed">ล้มเหลว</Text>
                    </Group>
                </Group>
            </Group>

            <svg width="100%" viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} style={{ overflow: 'visible' }}>
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                    const yy = paddingTop + chartHeight - frac * chartHeight
                    const val = Math.round(maxVal * frac)
                    return (
                        <g key={frac}>
                            <line x1={paddingX} y1={yy} x2={viewBoxW - paddingX} y2={yy} stroke="#e9ecef" strokeWidth={0.5} />
                            <text x={paddingX - 6} y={yy + 4} textAnchor="end" fontSize={10} fill="#adb5bd">{val}</text>
                        </g>
                    )
                })}

                {data.map((d, i) => {
                    const cx = paddingX + i * barGroupW + barGroupW / 2
                    const sH = (d.success_count / maxVal) * chartHeight
                    const fH = (d.failed_count / maxVal) * chartHeight

                    const dayLabel = new Date(d.date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                    })

                    return (
                        <g key={i}>
                            {/* Success bar */}
                            <rect
                                x={cx - barW - gapBetween / 2}
                                y={paddingTop + chartHeight - sH}
                                width={barW}
                                height={sH}
                                rx={3}
                                fill="var(--mantine-color-green-6)"
                                opacity={0.85}
                            />
                            {/* Success count label */}
                            {d.success_count > 0 && (
                                <text
                                    x={cx - gapBetween / 2 - barW / 2}
                                    y={paddingTop + chartHeight - sH - 4}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="var(--mantine-color-green-7)"
                                    fontWeight={600}
                                >
                                    {d.success_count}
                                </text>
                            )}
                            {/* Fail bar */}
                            <rect
                                x={cx + gapBetween / 2}
                                y={paddingTop + chartHeight - fH}
                                width={barW}
                                height={fH}
                                rx={3}
                                fill="var(--mantine-color-red-5)"
                                opacity={0.85}
                            />
                            {/* Fail count label */}
                            {d.failed_count > 0 && (
                                <text
                                    x={cx + gapBetween / 2 + barW / 2}
                                    y={paddingTop + chartHeight - fH - 4}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fill="var(--mantine-color-red-6)"
                                    fontWeight={600}
                                >
                                    {d.failed_count}
                                </text>
                            )}
                            {/* Day label */}
                            <text
                                x={cx}
                                y={paddingTop + chartHeight + 18}
                                textAnchor="middle"
                                fontSize={11}
                                fill="#868e96"
                            >
                                {dayLabel}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </Card>
    )
}
