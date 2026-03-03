import type { ServerResponse } from 'node:http'
import type { SSEEvent } from './types'

export class SSEManager {
  private clients: Set<ServerResponse> = new Set()

  addClient(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write(': connected\n\n')
    this.clients.add(res)
    res.on('close', () => {
      this.clients.delete(res)
    })
  }

  broadcast(event: SSEEvent): void {
    const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
    for (const client of this.clients) {
      client.write(data)
    }
  }

  get clientCount(): number {
    return this.clients.size
  }

  closeAll(): void {
    for (const client of this.clients) {
      client.end()
    }
    this.clients.clear()
  }
}
