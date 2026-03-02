import type { VizGraph } from '../graph'

export interface JsonOptions {
  pretty?: boolean
}

/**
 * VizGraph をそのまま JSON で出力する
 */
export function renderJson(graph: VizGraph, options?: JsonOptions): string {
  const pretty = options?.pretty ?? true
  return pretty ? JSON.stringify(graph, null, 2) : JSON.stringify(graph)
}
