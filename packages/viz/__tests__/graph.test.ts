import { describe, it, expect } from 'vitest'
import { buildGraph } from '../src/graph'
import type { ProjectAnalysis } from '@inngest-tools/core'

function makeAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    functions: [],
    eventMap: {},
    diagnostics: [],
    analyzedFiles: 0,
    analysisTimeMs: 0,
    ...overrides,
  }
}

describe('buildGraph', () => {
  it('creates function and event nodes for a simple function', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'process-order',
          filePath: '/src/order.ts',
          relativePath: 'src/order.ts',
          line: 5,
          column: 1,
          triggers: [{ type: 'event', event: 'order/created', isDynamic: false, line: 5 }],
          steps: [{ id: 'step1', type: 'run', line: 6, column: 1, depth: 0 }],
          sends: [],
          waitsFor: [],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    expect(graph.nodes).toHaveLength(2) // function + event
    expect(graph.nodes.find((n) => n.type === 'function')).toBeDefined()
    expect(graph.nodes.find((n) => n.type === 'event')).toBeDefined()
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].type).toBe('triggers')
  })

  it('creates cron nodes', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'daily-cleanup',
          filePath: '/src/cron.ts',
          relativePath: 'src/cron.ts',
          line: 3,
          column: 1,
          triggers: [{ type: 'cron', cron: '0 3 * * *', line: 3 }],
          steps: [],
          sends: [],
          waitsFor: [],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    expect(graph.nodes.find((n) => n.type === 'cron')).toBeDefined()
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].type).toBe('triggers')
  })

  it('creates send edges', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'sender',
          filePath: '/src/sender.ts',
          relativePath: 'src/sender.ts',
          line: 1,
          column: 1,
          triggers: [{ type: 'event', event: 'start', isDynamic: false, line: 1 }],
          steps: [],
          sends: [{ eventName: 'user/created', isDynamic: false, line: 5 }],
          waitsFor: [],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    const sendEdge = graph.edges.find((e) => e.type === 'sends')
    expect(sendEdge).toBeDefined()
    expect(sendEdge!.target).toContain('user_created')
  })

  it('creates waitForEvent edges', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'waiter',
          filePath: '/src/waiter.ts',
          relativePath: 'src/waiter.ts',
          line: 1,
          column: 1,
          triggers: [{ type: 'event', event: 'start', isDynamic: false, line: 1 }],
          steps: [],
          sends: [],
          waitsFor: [
            { stepId: 'wait', eventName: 'approval', isDynamic: false, timeout: '24h', line: 5 },
          ],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    const waitEdge = graph.edges.find((e) => e.type === 'waitForEvent')
    expect(waitEdge).toBeDefined()
  })

  it('creates invoke edges', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'caller',
          filePath: '/src/caller.ts',
          relativePath: 'src/caller.ts',
          line: 1,
          column: 1,
          triggers: [{ type: 'event', event: 'start', isDynamic: false, line: 1 }],
          steps: [
            { id: 'call', type: 'invoke', line: 5, column: 1, depth: 0, invokeTarget: 'callee' },
          ],
          sends: [],
          waitsFor: [],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    const invokeEdge = graph.edges.find((e) => e.type === 'invoke')
    expect(invokeEdge).toBeDefined()
    expect(invokeEdge!.target).toContain('callee')
  })

  it('deduplicates event nodes', () => {
    const analysis = makeAnalysis({
      functions: [
        {
          id: 'fn1',
          filePath: '/src/fn1.ts',
          relativePath: 'src/fn1.ts',
          line: 1,
          column: 1,
          triggers: [{ type: 'event', event: 'shared/event', isDynamic: false, line: 1 }],
          steps: [],
          sends: [],
          waitsFor: [],
          config: {},
        },
        {
          id: 'fn2',
          filePath: '/src/fn2.ts',
          relativePath: 'src/fn2.ts',
          line: 1,
          column: 1,
          triggers: [{ type: 'event', event: 'shared/event', isDynamic: false, line: 1 }],
          steps: [],
          sends: [],
          waitsFor: [],
          config: {},
        },
      ],
    })

    const graph = buildGraph(analysis)
    const eventNodes = graph.nodes.filter((n) => n.type === 'event')
    expect(eventNodes).toHaveLength(1) // Only one event node for shared/event
  })
})
