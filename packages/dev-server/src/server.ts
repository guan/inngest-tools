import * as http from 'node:http'
import type { SSEManager } from './sse'
import type { Analyzer } from './analyzer'
import { renderDashboard } from './dashboard'

export interface ServerOptions {
  port: number
  host: string
  analyzer: Analyzer
  sse: SSEManager
}

export function createServer(options: ServerOptions): http.Server {
  const { analyzer, sse } = options
  let dashboardHtml: string | null = null

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (url.pathname === '/' && req.method === 'GET') {
      if (!dashboardHtml) dashboardHtml = renderDashboard()
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(dashboardHtml)
      return
    }

    if (url.pathname === '/api/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(analyzer.getState()))
      return
    }

    if (url.pathname === '/api/events' && req.method === 'GET') {
      sse.addClient(res)
      const stateData = `event: state\ndata: ${JSON.stringify(analyzer.getState())}\n\n`
      res.write(stateData)
      return
    }

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      analyzer.analyze()
      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'analysis-triggered' }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  })

  return server
}
