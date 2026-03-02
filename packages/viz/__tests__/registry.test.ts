import { describe, it, expect } from 'vitest'
import { renderGraph, listFormats } from '../src/renderers/registry'
import type { VizGraph } from '../src/graph'

const sampleGraph: VizGraph = {
  nodes: [
    { id: 'E_ev', type: 'event', label: 'ev', metadata: {} },
    { id: 'F_fn', type: 'function', label: 'fn', metadata: { filePath: 'src/fn.ts', line: 1 } },
  ],
  edges: [
    { source: 'E_ev', target: 'F_fn', type: 'triggers', label: 'triggers' },
  ],
}

describe('listFormats', () => {
  it('returns all supported formats', () => {
    const formats = listFormats()
    expect(formats).toContain('mermaid')
    expect(formats).toContain('json')
    expect(formats).toContain('dot')
    expect(formats).toContain('html')
  })
})

describe('renderGraph', () => {
  it('renders mermaid format', () => {
    const output = renderGraph('mermaid', sampleGraph)
    expect(output).toContain('graph LR')
  })

  it('renders json format', () => {
    const output = renderGraph('json', sampleGraph)
    const parsed = JSON.parse(output)
    expect(parsed.nodes).toHaveLength(2)
  })

  it('renders dot format', () => {
    const output = renderGraph('dot', sampleGraph)
    expect(output).toContain('digraph inngest')
  })

  it('renders html format', () => {
    const output = renderGraph('html', sampleGraph)
    expect(output).toContain('<!DOCTYPE html>')
  })

  it('throws on unknown format', () => {
    expect(() => renderGraph('unknown', sampleGraph)).toThrow('Unknown format "unknown"')
  })

  it('passes options through to renderer', () => {
    const output = renderGraph('mermaid', sampleGraph, { direction: 'TB' })
    expect(output).toContain('graph TB')
  })

  it('passes title option for html', () => {
    const output = renderGraph('html', sampleGraph, { title: 'Custom Title' })
    expect(output).toContain('<title>Custom Title</title>')
  })

  it('filters edges to orphan nodes when showOrphans is false', () => {
    const graphWithOrphan: VizGraph = {
      nodes: [
        { id: 'E_ev', type: 'event', label: 'ev', metadata: {} },
        { id: 'F_fn', type: 'function', label: 'fn', metadata: { filePath: 'src/fn.ts', line: 1 } },
        { id: 'F_orphan', type: 'function', label: 'orphan', metadata: { filePath: 'src/orphan.ts' } },
      ],
      edges: [
        { source: 'E_ev', target: 'F_fn', type: 'triggers', label: 'triggers' },
      ],
    }

    // With showOrphans=false, orphan node should be filtered
    const mermaidOutput = renderGraph('mermaid', graphWithOrphan, { showOrphans: false })
    expect(mermaidOutput).not.toContain('F_orphan')
    expect(mermaidOutput).toContain('F_fn')

    const dotOutput = renderGraph('dot', graphWithOrphan, { showOrphans: false })
    expect(dotOutput).not.toContain('F_orphan')
    expect(dotOutput).toContain('F_fn')
  })
})
