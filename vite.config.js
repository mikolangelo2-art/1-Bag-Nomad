import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  optimizeDeps: {
    include: ['prop-types', 'react-simple-maps'],
  },
})
