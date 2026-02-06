import { createTheme, MantineColorsTuple } from '@mantine/core'

// Primary Color - Orange
const orange: MantineColorsTuple = [
  '#fff4e6',
  '#ffe8cc',
  '#ffd19a',
  '#ffb866',
  '#ffa03d',
  '#ff8c42', // Primary
  '#ff6b35', // Primary Dark
  '#e55a2b',
  '#cc4f22',
  '#b3441a',
]

// Secondary Color - Blue
const blue: MantineColorsTuple = [
  '#e3f2fd',
  '#bbdefb',
  '#90caf9',
  '#64b5f6',
  '#42a5f5',
  '#4facfe', // Secondary
  '#00f2fe', // Secondary Light
  '#2196f3',
  '#1e88e5',
  '#1976d2',
]

export const theme = createTheme({
  primaryColor: 'orange',
  colors: {
    orange,
    blue,
  },
  fontFamily: "'Kanit', 'Arial', sans-serif",
  headings: {
    fontFamily: "'Kanit', 'Arial', sans-serif",
    sizes: {
      h1: { fontSize: '2.5rem', lineHeight: '1.2' },
      h2: { fontSize: '2rem', lineHeight: '1.3' },
      h3: { fontSize: '1.75rem', lineHeight: '1.4' },
      h4: { fontSize: '1.5rem', lineHeight: '1.4' },
    },
  },
  defaultRadius: 'lg',
  components: {
    Button: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Card: {
      defaultProps: {
        radius: 'xl',
        shadow: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'xl',
        shadow: 'sm',
      },
    },
  },
})
