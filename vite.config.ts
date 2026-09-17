import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base: './' makes the build output work when hosted from a GitHub Pages
// project page (e.g. https://username.github.io/repo-name/) as well as
// from a custom domain or user/organization page. If you deploy to a
// project page, GitHub Pages serves from a subpath, and relative asset
// paths avoid needing to hardcode that subpath here.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
