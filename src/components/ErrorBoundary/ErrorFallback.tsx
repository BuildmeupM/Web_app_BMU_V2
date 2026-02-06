import { Container, Title, Text, Button, Stack, Alert } from '@mantine/core'
import { TbAlertCircle, TbRefresh, TbHome } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const navigate = useNavigate()

  const handleGoHome = () => {
    resetErrorBoundary()
    navigate('/dashboard')
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="md" align="center">
        <Alert
          icon={<TbAlertCircle size={24} />}
          title="เกิดข้อผิดพลาด"
          color="red"
          variant="light"
          style={{ width: '100%' }}
        >
          <Text size="sm" mb="md">
            {error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'}
          </Text>
          {import.meta.env.DEV && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                รายละเอียดข้อผิดพลาด (Development Only)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {error.stack}
              </pre>
            </details>
          )}
        </Alert>
        <Stack gap="xs">
          <Button
            leftSection={<TbRefresh size={16} />}
            onClick={resetErrorBoundary}
            color="orange"
            fullWidth
          >
            ลองใหม่อีกครั้ง
          </Button>
          <Button
            leftSection={<TbHome size={16} />}
            onClick={handleGoHome}
            variant="light"
            fullWidth
          >
            กลับไปหน้าแรก
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
