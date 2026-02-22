/**
 * StatusBarChart — Horizontal bar chart for status distribution
 */

import { Paper, Group, Text } from '@mantine/core'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ChartIcon } from '../AccountingIcons'
import type { StatusCount } from './constants'

export default function StatusBarChart({ data, title }: { data: StatusCount[]; title: string }) {
    return (
        <Paper
            p="lg"
            radius="lg"
            className="acct-glass-card"
        >
            <Group gap={8} mb="md">
                <div className="acct-section-icon"><ChartIcon /></div>
                <Text size="sm" fw={700} c="dark">{title}</Text>
            </Group>
            <ResponsiveContainer width="100%" height={Math.max(data.length * 38, 200)}>
                <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fill: '#666', fontSize: 12 }} />
                    <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fill: '#444', fontSize: 12 }}
                        width={110}
                    />
                    <RechartsTooltip
                        contentStyle={{
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid #f0f0f0',
                            borderRadius: 12,
                            color: '#333',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        }}
                    />
                    <Bar dataKey="count" name="จำนวน" radius={[0, 6, 6, 0]}>
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Paper>
    )
}
