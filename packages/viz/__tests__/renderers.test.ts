import { describe, it, expect } from 'vitest'
import { renderJson } from '../src/renderers/json'
import { renderDot } from '../src/renderers/dot'
import { renderHtml } from '../src/renderers/html'
import type { VizGraph } from '../src/graph'

const sampleGraph: VizGraph = {
  nodes: [
    { id: 'E_order_created', type: 'event', label: 'order/created', metadata: {} },
    {
      id: 'F_process_order',
      type: 'function',
      label: 'process-order',
      metadata: { filePath: 'src/order.ts', line: 12, stepsCount: 3 },
    },
    { id: 'C_0_3', type: 'cron', label: '0 3 * * *', metadata: { cronSchedule: '0 3 * * *' } },
    {
      id: 'F_cleanup',
      type: 'function',
      label: 'cleanup',
      metadata: { filePath: 'src/cron.ts', line: 5 },
    },
  ],
  edges: [
    { source: 'E_order_created', target: 'F_process_order', type: 'triggers', label: 'triggers' },
    { source: 'C_0_3', target: 'F_cleanup', type: 'triggers', label: 'cron' },
  ],
}

describe('renderJson', () => {
  it('produces valid JSON', () => {
    const output = renderJson(sampleGraph)
    const parsed = JSON.parse(output)
    expect(parsed.nodes).toHaveLength(4)
    expect(parsed.edges).toHaveLength(2)
  })

  it('supports compact output', () => {
    const output = renderJson(sampleGraph, { pretty: false })
    expect(output).not.toContain('\n')
  })
})

describe('renderDot', () => {
  it('produces valid DOT output', () => {
    const output = renderDot(sampleGraph)
    expect(output).toContain('digraph inngest {')
    expect(output).toContain('rankdir=LR')
    expect(output).toContain('cluster_events')
    expect(output).toContain('cluster_functions')
    expect(output).toContain('cluster_cron')
    expect(output).toContain('E_order_created -> F_process_order')
    expect(output).toContain('}')
  })

  it('respects direction option', () => {
    const output = renderDot(sampleGraph, { direction: 'TB' })
    expect(output).toContain('rankdir=TB')
  })

  it('uses diamond shape for events', () => {
    const output = renderDot(sampleGraph)
    expect(output).toContain('shape=diamond')
  })

  it('uses box shape for functions', () => {
    const output = renderDot(sampleGraph)
    expect(output).toContain('shape=box')
  })

  it('uses circle shape for cron', () => {
    const output = renderDot(sampleGraph)
    expect(output).toContain('shape=circle')
  })

  it('clusters by file when requested', () => {
    const output = renderDot(sampleGraph, { clusterByFile: true })
    expect(output).toContain('src/order.ts')
    expect(output).toContain('src/cron.ts')
  })
})

describe('renderHtml', () => {
  it('produces valid HTML', () => {
    const output = renderHtml(sampleGraph)
    expect(output).toContain('<!DOCTYPE html>')
    expect(output).toContain('</html>')
    expect(output).toContain('d3.v7.min.js')
  })

  it('embeds graph data as JSON', () => {
    const output = renderHtml(sampleGraph)
    expect(output).toContain('order/created')
    expect(output).toContain('process-order')
  })

  it('respects title option', () => {
    const output = renderHtml(sampleGraph, { title: 'My Graph' })
    expect(output).toContain('<title>My Graph</title>')
  })

  it('includes filter input', () => {
    const output = renderHtml(sampleGraph)
    expect(output).toContain('id="filter"')
  })

  it('includes legend', () => {
    const output = renderHtml(sampleGraph)
    expect(output).toContain('Function')
    expect(output).toContain('Event')
    expect(output).toContain('Cron')
  })
})
