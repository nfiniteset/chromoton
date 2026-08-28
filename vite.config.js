import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, existsSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Each monthly cinema variation lives at cinema/<name>/index.html (see
// src/cinema/README.md). Discovered automatically so a new variation folder
// doesn't require touching this config. cinema/index.html itself (a static
// redirect to whichever variation is current) is included too, since it
// isn't inside a dated subfolder and the build only bundles listed inputs.
function findCinemaEntries() {
  const cinemaDir = resolve(__dirname, 'cinema')
  if (!existsSync(cinemaDir)) return {}
  const variantEntries = Object.fromEntries(
    readdirSync(cinemaDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        existsSync(resolve(cinemaDir, entry.name, 'index.html'))
      )
      .map((entry) => [
        `cinema-${entry.name}`,
        resolve(cinemaDir, entry.name, 'index.html'),
      ])
  )
  const rootIndex = resolve(cinemaDir, 'index.html')
  return existsSync(rootIndex)
    ? { cinema: rootIndex, ...variantEntries }
    : variantEntries
}

// Vite's dev-server SPA fallback serves the root index.html for any request
// that isn't an exact file match — including "/cinema/<variant>" without a
// trailing slash, since only "cinema/<variant>/index.html" (matched via the
// slash-terminated URL) exists. Redirect so the no-slash URL doesn't
// silently load the wrong page.
function cinemaTrailingSlashRedirect() {
  return {
    name: 'cinema-trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (/^\/cinema(\/[^/]+)?$/.test(url.pathname)) {
          res.statusCode = 302
          res.setHeader('Location', url.pathname + '/' + url.search)
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
        ...findCinemaEntries(),
      },
    },
  },
})
