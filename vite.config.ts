import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow access from any IP address on the network
    port: 3000,
    open: true,
    strictPort: false, // If port 3000 is in use, try next available port
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mantine-vendor': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/form',
            '@mantine/notifications',
            '@mantine/dates',
            '@mantine/charts',
          ],
          'query-vendor': ['react-query'],
          'utils-vendor': ['axios', 'dayjs', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable source maps in production for smaller bundle
    minify: 'esbuild', // Use esbuild for faster minification
  },
})
