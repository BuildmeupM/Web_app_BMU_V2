/**
 * Vitest Configuration for Backend Tests
 * แยก config สำหรับ backend tests
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/**/*.test.js', 'backend/**/*.test.js.skip'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['backend/**/*.js'],
      exclude: [
        'node_modules/',
        'backend/**/__tests__/**',
        '**/*.test.js',
        '**/*.config.js',
      ],
    },
  },
})
