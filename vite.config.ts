import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/sotv/", // <--- ADD THIS LINE (Replace 'shadows-void' with your actual repo name)
})