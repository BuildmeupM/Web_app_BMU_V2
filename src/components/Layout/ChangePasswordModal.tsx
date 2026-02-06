/**
 * Change Password Modal
 * Modal สำหรับเปลี่ยนรหัสผ่าน (สำหรับพนักงานเปลี่ยนรหัสผ่านเอง)
 */

import { Modal, Stack, TextInput, Button, Group, Alert } from '@mantine/core'
import { useState } from 'react'
import { useMutation } from 'react-query'
import { authService } from '../../services/authService'
import { notifications } from '@mantine/notifications'
import { TbAlertCircle, TbCheck, TbEye, TbEyeOff } from 'react-icons/tb'

interface ChangePasswordModalProps {
  opened: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ opened, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changePasswordMutation = useMutation(authService.changePassword, {
    onSuccess: () => {
      notifications.show({
        title: 'สำเร็จ',
        message: 'เปลี่ยนรหัสผ่านสำเร็จ',
        color: 'green',
        icon: <TbCheck size={16} />,
      })
      // Reset form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      onClose()
    },
    onError: (error: any) => {
      setError(error?.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้')
      notifications.show({
        title: 'เกิดข้อผิดพลาด',
        message: error?.response?.data?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้',
        color: 'red',
        icon: <TbAlertCircle size={16} />,
      })
    },
  })

  const handleSubmit = () => {
    // Reset error
    setError(null)

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน')
      return
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน')
      return
    }

    if (currentPassword === newPassword) {
      setError('รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน')
      return
    }

    // Submit
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="เปลี่ยนรหัสผ่าน"
      size="md"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<TbAlertCircle size={16} />} color="red" title="เกิดข้อผิดพลาด">
            {error}
          </Alert>
        )}

        <TextInput
          label="รหัสผ่านปัจจุบัน"
          type={showCurrentPassword ? 'text' : 'password'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านปัจจุบัน"
          rightSection={
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showCurrentPassword ? <TbEyeOff size={18} /> : <TbEye size={18} />}
            </button>
          }
          required
        />

        <TextInput
          label="รหัสผ่านใหม่"
          type={showNewPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
          rightSection={
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showNewPassword ? <TbEyeOff size={18} /> : <TbEye size={18} />}
            </button>
          }
          required
        />

        <TextInput
          label="ยืนยันรหัสผ่านใหม่"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
          rightSection={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showConfirmPassword ? <TbEyeOff size={18} /> : <TbEye size={18} />}
            </button>
          }
          required
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            loading={changePasswordMutation.isLoading}
            color="orange"
          >
            เปลี่ยนรหัสผ่าน
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
