import { Center, Loader, Text, Stack } from '@mantine/core'

interface LoadingSpinnerProps {
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullHeight?: boolean
}

export default function LoadingSpinner({
  message = 'กำลังโหลด...',
  size = 'lg',
  fullHeight = false,
}: LoadingSpinnerProps) {
  return (
    <Center style={fullHeight ? { minHeight: '100vh' } : { padding: '2rem' }}>
      <Stack gap="md" align="center">
        <Loader size={size} color="orange" />
        {message && (
          <Text size="sm" c="dimmed">
            {message}
          </Text>
        )}
      </Stack>
    </Center>
  )
}
