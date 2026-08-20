import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Vite's dev-server SPA fallback serves the root index.html for any request
// that isn't an exact file match — including "/cinema" without a trailing
// slash, since only "cinema/index.html" (matched via "/cinema/") exists.
// Redirect so the no-slash URL doesn't silently load the wrong page.
function cinemaTrailingSlashRedirect() {
  return {
    name: 'cinema-trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname === '/cinema') {
          res.statusCode = 302
          res.setHeader('Location', '/cinema/' + url.search)
          res.end()
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), cinemaTrailingSlashRedirect()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cinema: resolve(__dirname, 'cinema/index.html'),
      },
    },
  },
})
