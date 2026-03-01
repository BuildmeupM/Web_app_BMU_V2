import React, { memo } from 'react';
import { Table, Checkbox, Text, Group, Avatar, Badge, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { TbShieldCheck, TbShieldX, TbTrash } from 'react-icons/tb';
import { type LoginAttempt } from '../../services/loginActivityService';
import { formatDateTime, failureReasonLabels } from './constants';

interface LoginAttemptRowProps {
    attempt: LoginAttempt;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    onDeleteClick: (id: string) => void;
}

const LoginAttemptRow = memo(({ attempt, isSelected, onToggleSelect, onDeleteClick }: LoginAttemptRowProps) => {
    return (
        <Table.Tr
            style={{
                backgroundColor: isSelected ? 'var(--mantine-color-red-0)' : undefined,
            }}
        >
            <Table.Td>
                <Checkbox
                    size="xs"
                    checked={isSelected}
                    onChange={() => onToggleSelect(attempt.id)}
                    aria-label={`เลือก ${attempt.username}`}
                />
            </Table.Td>
            <Table.Td>
                <Text size="xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatDateTime(attempt.attempted_at)}
                </Text>
            </Table.Td>
            <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Group gap="xs" wrap="nowrap">
                    <Avatar size="xs" radius="xl" color="orange" style={{ flexShrink: 0 }}>
                        {attempt.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                            {attempt.nick_name || attempt.user_name || attempt.username}
                        </Text>
                        {(attempt.nick_name || attempt.user_name) && (
                            <Text size="xs" c="dimmed" truncate>
                                @{attempt.username}
                            </Text>
                        )}
                    </div>
                </Group>
            </Table.Td>
            <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {attempt.ip_address ? (
                    attempt.is_internal ? (
                        <Group gap={4} wrap="nowrap">
                            <Text size="xs" c="dimmed" truncate>
                                {attempt.ip_address}
                            </Text>
                            <Badge size="xs" variant="light" color="green" style={{ flexShrink: 0 }}>
                                ภายใน
                            </Badge>
                        </Group>
                    ) : (
                        <Paper
                            p={4}
                            radius="sm"
                            style={{
                                backgroundColor: 'var(--mantine-color-red-0)',
                                border: '1px solid var(--mantine-color-red-3)',
                                overflow: 'hidden',
                            }}
                        >
                            <Group gap={4} wrap="nowrap">
                                <Text size="xs" c="red" fw={600} truncate>
                                    {attempt.ip_address}
                                </Text>
                                <Badge size="xs" variant="filled" color="red" style={{ flexShrink: 0 }}>
                                    ภายนอก
                                </Badge>
                            </Group>
                        </Paper>
                    )
                ) : (
                    <Text size="xs" c="dimmed">
                        –
                    </Text>
                )}
            </Table.Td>
            <Table.Td>
                {attempt.success ? (
                    <Badge color="green" variant="light" size="sm" leftSection={<TbShieldCheck size={12} />}>
                        สำเร็จ
                    </Badge>
                ) : (
                    <Badge color="red" variant="light" size="sm" leftSection={<TbShieldX size={12} />}>
                        ล้มเหลว
                    </Badge>
                )}
            </Table.Td>
            <Table.Td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
                    {attempt.failure_reason ? failureReasonLabels[attempt.failure_reason] || attempt.failure_reason : '–'}
                </Text>
            </Table.Td>
            <Table.Td>
                <Tooltip label="ลบรายการนี้">
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onDeleteClick(attempt.id)}
                    >
                        <TbTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Table.Td>
        </Table.Tr>
    );
});

LoginAttemptRow.displayName = 'LoginAttemptRow';

export default LoginAttemptRow;
