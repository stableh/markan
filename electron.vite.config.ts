import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'electron/main.ts'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'electron/preload.ts'
      }
    }
  },
  renderer: {
    root: '.',
    cacheDir: 'node_modules/.vite_renderer',
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    },
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    plugins: [
      react(),
      tailwindcss()
    ]
  }
})
