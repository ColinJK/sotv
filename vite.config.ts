import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This ensures the server handles HMR correctly
    hmr: {
      overlay: false,
    },
  },
})