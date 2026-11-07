import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/aigis-exp-calc/',
  plugins: [react()],
  test: { environment: 'node' },
})
