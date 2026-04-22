import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 相对路径：便于 Android WebView 通过 file:///android_asset/dist/index.html 加载
export default defineConfig({
  base: './',
  plugins: [react()],
})
