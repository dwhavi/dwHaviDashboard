import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function wrapVercelHandler(handler, extraQuery = {}) {
  return (req, res, next) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks)
      const url = new URL(req.url, `http://${req.headers.host}`)
      const ct = req.headers['content-type'] || ''

      let body = null
      if (bodyBuffer.length > 0) {
        if (ct.includes('application/json')) {
          try { body = JSON.parse(bodyBuffer.toString()) } catch { body = null }
        } else {
          body = bodyBuffer
        }
      }

      const vReq = {
        method: req.method,
        headers: req.headers,
        query: { ...Object.fromEntries(url.searchParams), ...extraQuery },
        body,
      }

      const vRes = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this },
        setHeader(key, val) { res.setHeader(key, val); return this },
        getHeader(key) { return res.getHeader(key) },
        json(data) {
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = this.statusCode
          res.end(JSON.stringify(data))
        },
        end(data) {
          if (data) res.end(data)
          else res.end()
        },
      }

      Promise.resolve(handler(vReq, vRes)).catch((err) => {
        console.error('API Error:', err)
        res.statusCode = 500
        res.end(JSON.stringify({ success: false, error: err.message }))
      })
    })
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-dev-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next()

          const url = new URL(req.url, `http://${req.headers.host}`)
          const pathname = url.pathname
          let handlerPath = null
          let extraQuery = {}

          if (pathname === '/api/projects' || pathname === '/api/projects/') {
            handlerPath = path.join(__dirname, 'api', 'projects.js')
          } else if (/^\/api\/projects\/([^/]+)$/.test(pathname)) {
            const id = pathname.split('/')[3]
            handlerPath = path.join(__dirname, 'api', 'projects', '[id].js')
            extraQuery = { id }
          } else if (pathname === '/api/upload') {
            handlerPath = path.join(__dirname, 'api', 'upload.js')
          } else if (pathname === '/api/drive-upload') {
            handlerPath = path.join(__dirname, 'api', 'drive-upload.js')
          } else if (pathname === '/api/drive-url') {
            handlerPath = path.join(__dirname, 'api', 'drive-url.js')
          } else if (pathname === '/api/readme') {
            handlerPath = path.join(__dirname, 'api', 'readme.js')
          } else if (pathname === '/api/auth') {
            handlerPath = path.join(__dirname, 'api', 'auth.js')
          }

          if (!handlerPath || !fs.existsSync(handlerPath)) return next()

          try {
            // Clear require cache for hot reload
            const mod = await import(handlerPath + '?t=' + Date.now())
            const handler = mod.default
            if (!handler) return next()
            wrapVercelHandler(handler, extraQuery)(req, res, next)
          } catch (err) {
            console.error('Failed to load API handler:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: 'API handler load failed' }))
          }
        })
      },
    },
  ],
})
