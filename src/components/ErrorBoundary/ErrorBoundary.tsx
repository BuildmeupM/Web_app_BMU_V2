import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Container, Title, Text, Button, Stack, Alert } from '@mantine/core'
import { TbAlertCircle, TbRefresh } from 'react-icons/tb'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Log error to error tracking service (if available)
    // Example: logErrorToService(error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
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
                เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
              </Text>
              {import.meta.env.DEV && this.state.error && (
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
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </Alert>
            <Button
              leftSection={<TbRefresh size={16} />}
              onClick={this.handleReset}
              color="orange"
            >
              ลองใหม่อีกครั้ง
            </Button>
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
