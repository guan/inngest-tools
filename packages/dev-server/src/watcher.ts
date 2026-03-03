import * as fs from 'node:fs'
import * as path from 'node:path'

export interface WatcherOptions {
  targetDir: string
  debounceMs: number
  ignore?: string[]
  onChange: () => void
}

export interface WatcherHandle {
  close(): void
}

export function startWatcher(options: WatcherOptions): WatcherHandle {
  const { targetDir, debounceMs, ignore = [], onChange } = options
  let timer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const shouldIgnore = (filename: string): boolean => {
    if (filename.includes('node_modules') || filename.includes('dist')) return true
    if (!/\.(ts|tsx|js|jsx)$/.test(filename)) return true
    for (const pattern of ignore) {
      if (filename.includes(pattern)) return true
    }
    return false
  }

  const handleChange = (_eventType: string, filename: string | null) => {
    if (closed) return
    if (filename && shouldIgnore(filename)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!closed) onChange()
    }, debounceMs)
  }

  let watcher: fs.FSWatcher
  try {
    watcher = fs.watch(targetDir, { recursive: true }, handleChange)
  } catch {
    watcher = fs.watch(targetDir, handleChange)
  }

  return {
    close() {
      closed = true
      if (timer) clearTimeout(timer)
      watcher.close()
    },
  }
}
