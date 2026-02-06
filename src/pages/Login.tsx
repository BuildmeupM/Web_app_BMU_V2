import { useState, useEffect } from 'react'
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
} from '@mantine/core'
import { TbAlertCircle } from 'react-icons/tb'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // Redirect ถ้า login อยู่แล้ว
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate input
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')
      setLoading(false)
      return
    }

    try {
      // เรียก API login
      const response = await authService.login({ username, password })
      
      if (response.data && response.data.user && response.data.token) {
        // Login สำเร็จ - บันทึกข้อมูล user และ token
        login(response.data.user, response.data.token)
        navigate('/dashboard', { replace: true })
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ไม่ได้รับข้อมูล user หรือ token')
      }
    } catch (err: any) {
      // Handle error จาก API
      console.error('Login error:', err)
      
      // ตรวจสอบประเภท error
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า Backend server กำลังทำงานอยู่ (http://localhost:3001)')
      } else if (err.response?.status === 423) {
        // Account locked
        setError(err.response?.data?.message || 'บัญชีถูกล็อคชั่วคราวเนื่องจากพยายามเข้าสู่ระบบผิดหลายครั้ง')
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        // Invalid credentials หรือ inactive account
        setError(err.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      } else if (err.response?.status === 400) {
        // Validation error
        setError(err.response?.data?.message || 'ข้อมูลไม่ถูกต้อง')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (err.message || 'Unknown error'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size={420} my={40}>
      <Stack gap="xl">
        <div style={{ textAlign: 'center' }}>
          <Title order={2} c="orange" mb="xs">
            BMU Work Management System
          </Title>
          <Text c="dimmed">เข้าสู่ระบบเพื่อใช้งาน</Text>
        </div>

        <Paper withBorder shadow="md" p={30} radius="xl">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert icon={<TbAlertCircle size={16} />} color="red">
                  {error}
                </Alert>
              )}

              <TextInput
                label="ชื่อผู้ใช้"
                placeholder="กรอกชื่อผู้ใช้"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                radius="lg"
              />

              <PasswordInput
                label="รหัสผ่าน"
                placeholder="กรอกรหัสผ่าน"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                radius="lg"
              />

              <Button
                type="submit"
                fullWidth
                mt="xl"
                size="md"
                radius="lg"
                loading={loading}
              >
                เข้าสู่ระบบ
              </Button>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Container>
  )
}
