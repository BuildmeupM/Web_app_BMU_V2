import React from 'react';
import { Modal, Group, Text, Stack, Paper, Avatar, Badge, Button } from '@mantine/core';
import { TbAlertTriangle } from 'react-icons/tb';
import { formatDateTime } from './constants';
import { type LoginAttempt } from '../../services/loginActivityService';

interface ExternalIpAlertModalProps {
    opened: boolean;
    onClose: () => void;
    externalAttemptsToday: LoginAttempt[];
}

export default function ExternalIpAlertModal({
    opened,
    onClose,
    externalAttemptsToday
}: ExternalIpAlertModalProps) {
    if (externalAttemptsToday.length === 0) return null;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <TbAlertTriangle size={22} color="var(--mantine-color-red-6)" />
                    <Text fw={700} c="red">⚠ พบการเข้าสู่ระบบจาก IP ภายนอก! (วันนี้)</Text>
                </Group>
            }
            centered
            size="lg"
            overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
            styles={{
                header: {
                    backgroundColor: 'var(--mantine-color-red-0)',
                    borderBottom: '2px solid var(--mantine-color-red-3)',
                },
                body: {
                    backgroundColor: 'var(--mantine-color-red-0)',
                },
            }}
        >
            <Stack gap="md">
                <Text size="sm" c="red.8" fw={500}>
                    ตรวจพบ {externalAttemptsToday.length} รายการเข้าสู่ระบบจาก IP ภายนอกวันนี้:
                </Text>

                <Stack gap="xs">
                    {externalAttemptsToday.map((a) => (
                        <Paper
                            key={a.id}
                            p="sm"
                            radius="md"
                            style={{
                                border: '1px solid var(--mantine-color-red-3)',
                                backgroundColor: '#fff',
                            }}
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="sm" wrap="nowrap">
                                    <Avatar size={32} radius="xl" color="red">
                                        {(a.nick_name || a.user_name || a.username)?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div>
                                        <Text size="sm" fw={600}>
                                            {a.nick_name || a.user_name || a.username}
                                        </Text>
                                        <Text size="xs" c="dimmed">@{a.username}</Text>
                                    </div>
                                </Group>
                                <div style={{ textAlign: 'right' }}>
                                    <Badge size="sm" variant="filled" color="red">
                                        {a.ip_address}
                                    </Badge>

                                    <Text size="xs" c="dimmed" mt={2}>
                                        {formatDateTime(a.attempted_at)}
                                    </Text>
                                </div>
                            </Group>
                        </Paper>
                    ))}
                </Stack>

                <Group justify="flex-end">
                    <Button
                        color="red"
                        variant="light"
                        onClick={onClose}
                    >
                        รับทราบ
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
