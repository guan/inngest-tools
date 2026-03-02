import type { VizGraph } from '../graph'
import type { RenderOptions } from './common'
import type { HtmlOptions } from './html'
import type { JsonOptions } from './json'
import { renderMermaid } from './mermaid'
import { renderJson } from './json'
import { renderDot } from './dot'
import { renderHtml } from './html'

type RendererFn = (graph: VizGraph, options?: RenderOptions & HtmlOptions & JsonOptions) => string

const RENDERERS = new Map<string, RendererFn>([
  ['mermaid', renderMermaid as RendererFn],
  ['json', renderJson as RendererFn],
  ['dot', renderDot as RendererFn],
  ['html', renderHtml as RendererFn],
])

export function renderGraph(format: string, graph: VizGraph, options?: RenderOptions & HtmlOptions & JsonOptions): string {
  const renderer = RENDERERS.get(format)
  if (!renderer) {
    throw new Error(`Unknown format "${format}". Available formats: ${listFormats().join(', ')}`)
  }
  return renderer(graph, options)
}

export function listFormats(): string[] {
  return Array.from(RENDERERS.keys())
}
