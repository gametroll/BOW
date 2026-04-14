import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite configuration for the app.
 *
 * - Vue plugin enables .vue files
 * - Tailwind plugin injects Tailwind v4 automatically
 */
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(), // <-- this is the important part
  ],
})