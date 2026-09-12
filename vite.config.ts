import { lezer } from '@lezer/generator/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const { BASE = '/' } = process.env

export default defineConfig({
  base: BASE.endsWith('/') ? BASE : `${BASE}/`,
  plugins: [lezer(), react(), tailwindcss()],
})

