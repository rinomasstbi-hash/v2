import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // FIX: Define process.env.API_KEY to make the environment variable available in the client-side code.
  // This is necessary to follow the Gemini API guidelines for API key handling in a Vite project.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
