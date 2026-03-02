import { describe, it, expect } from 'vitest'
import { renderMermaid } from '../src/renderers/mermaid'
import type { VizGraph } from '../src/graph'

const sampleGraph: VizGraph = {
  nodes: [
    { id: 'E_order_created', type: 'event', label: 'order/created', metadata: {} },
    { id: 'E_order_processed', type: 'event', label: 'order/processed', metadata: {} },
    {
      id: 'F_process_order',
      type: 'function',
      label: 'process-order',
      metadata: { filePath: 'src/order.ts', line: 12, stepsCount: 3 },
    },
    {
      id: 'F_send_confirmation',
      type: 'function',
      label: 'send-confirmation',
      metadata: { filePath: 'src/email.ts', line: 5, stepsCount: 1 },
    },
    { id: 'C_0_3____', type: 'cron', label: '0 3 * * *', metadata: { cronSchedule: '0 3 * * *' } },
    {
      id: 'F_daily_cleanup',
      type: 'function',
      label: 'daily-cleanup',
      metadata: { filePath: 'src/cron.ts', line: 3 },
    },
  ],
  edges: [
    { source: 'E_order_created', target: 'F_process_order', type: 'triggers', label: 'triggers' },
    { source: 'F_process_order', target: 'E_order_processed', type: 'sends', label: 'sends' },
    {
      source: 'E_order_processed',
      target: 'F_send_confirmation',
      type: 'triggers',
      label: 'triggers',
    },
    { source: 'C_0_3____', target: 'F_daily_cleanup', type: 'triggers', label: 'cron' },
  ],
}

describe('renderMermaid', () => {
  it('produces valid Mermaid output', () => {
    const output = renderMermaid(sampleGraph)
    expect(output).toContain('graph LR')
    expect(output).toContain('subgraph Events')
    expect(output).toContain('subgraph Functions')
    expect(output).toContain('subgraph Cron')
    expect(output).toContain('E_order_created -->|triggers| F_process_order')
    expect(output).toContain('F_process_order -->|sends| E_order_processed')
  })

  it('respects direction option', () => {
    const output = renderMermaid(sampleGraph, { direction: 'TB' })
    expect(output).toContain('graph TB')
  })

  it('hides orphans when showOrphans is false', () => {
    const graphWithOrphan: VizGraph = {
      nodes: [
        ...sampleGraph.nodes,
        { id: 'F_orphan', type: 'function', label: 'orphan-fn', metadata: {} },
      ],
      edges: sampleGraph.edges,
    }
    const output = renderMermaid(graphWithOrphan, { showOrphans: false })
    expect(output).not.toContain('F_orphan')
  })

  it('shows orphans by default', () => {
    const graphWithOrphan: VizGraph = {
      nodes: [
        ...sampleGraph.nodes,
        { id: 'F_orphan', type: 'function', label: 'orphan-fn', metadata: {} },
      ],
      edges: sampleGraph.edges,
    }
    const output = renderMermaid(graphWithOrphan)
    expect(output).toContain('F_orphan')
  })

  it('includes file path in function labels', () => {
    const output = renderMermaid(sampleGraph)
    expect(output).toContain('src/order.ts:12')
  })

  it('uses dashed arrows for waitForEvent', () => {
    const graph: VizGraph = {
      nodes: [
        { id: 'F_fn', type: 'function', label: 'fn', metadata: {} },
        { id: 'E_ev', type: 'event', label: 'ev', metadata: {} },
      ],
      edges: [
        { source: 'F_fn', target: 'E_ev', type: 'waitForEvent', label: 'waitForEvent' },
      ],
    }
    const output = renderMermaid(graph)
    expect(output).toContain('F_fn -.->|waitForEvent| E_ev')
  })

  it('uses thick arrows for invoke', () => {
    const graph: VizGraph = {
      nodes: [
        { id: 'F_caller', type: 'function', label: 'caller', metadata: {} },
        { id: 'F_callee', type: 'function', label: 'callee', metadata: {} },
      ],
      edges: [
        { source: 'F_caller', target: 'F_callee', type: 'invoke', label: 'invoke' },
      ],
    }
    const output = renderMermaid(graph)
    expect(output).toContain('F_caller ==>|invoke| F_callee')
  })
})
