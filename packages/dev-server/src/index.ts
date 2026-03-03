import { SSEManager } from './sse'
import { Analyzer } from './analyzer'
import { createServer } from './server'
import { startWatcher } from './watcher'
import type { DevServerOptions, DevServerHandle } from './types'

export type {
  DevServerOptions,
  DevServerHandle,
  DashboardState,
  SSEEvent,
} from './types'

export async function startDevServer(
  options: DevServerOptions
): Promise<DevServerHandle> {
  const {
    targetDir,
    port = 6600,
    host = '0.0.0.0',
    debounceMs = 300,
    ignore = [],
    tsConfigPath,
    lintConfig,
  } = options

  const sse = new SSEManager()
  const analyzer = new Analyzer({
    targetDir,
    analyzeOptions: { tsConfigPath, ignore },
    lintConfig,
    sse,
  })

  const server = createServer({ port, host, analyzer, sse })

  // Run initial analysis
  analyzer.analyze()

  // Start file watcher
  const watcher = startWatcher({
    targetDir,
    debounceMs,
    ignore,
    onChange: () => analyzer.analyze(),
  })

  // Start HTTP server
  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve())
  })

  const url = `http://${host}:${port}`

  return {
    url,
    async close() {
      watcher.close()
      sse.closeAll()
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    },
    triggerAnalysis() {
      analyzer.analyze()
    },
  }
}
