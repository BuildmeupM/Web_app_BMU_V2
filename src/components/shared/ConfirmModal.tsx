/**
 * ConfirmModal — Generic reusable confirmation dialog
 * Replaces 3+ near-identical implementations in WorkAssignment, LoginActivity, ErrorReport
 */

import { Modal, Stack, Group, Button, Text, Alert } from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'

export interface ConfirmModalProps {
  /** Whether the modal is open */
  opened: boolean
  /** Close handler */
  onClose: () => void
  /** Confirm action handler */
  onConfirm: () => void
  /** Modal title */
  title?: string
  /** Message to display (string or ReactNode) */
  message: React.ReactNode
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Confirm button color */
  confirmColor?: string
  /** Alert color for the message area */
  alertColor?: string
  /** Whether the confirm action is in progress */
  loading?: boolean
  /** Modal size */
  size?: string
}

export default function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title = 'ยืนยัน',
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  confirmColor = 'red',
  alertColor = 'orange',
  loading = false,
  size = 'md',
}: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack gap="md">
        <Alert color={alertColor} icon={<TbAlertCircle size={16} />}>
          {typeof message === 'string' ? <Text size="sm">{message}</Text> : message}
        </Alert>
        <Group justify="flex-end">
          <Button variant="light" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
