import { describe, it, expect } from 'vitest'
import { eventHasListener } from '../../src/rules/event-has-listener'
import type { ProjectAnalysis } from '@inngest-tools/core'

function makeAnalysis(eventMap: ProjectAnalysis['eventMap']): ProjectAnalysis {
  return {
    functions: [],
    eventMap,
    diagnostics: [],
    analyzedFiles: 0,
    analysisTimeMs: 0,
  }
}

describe('event-has-listener', () => {
  it('reports no diagnostics when all sent events have listeners', () => {
    const analysis = makeAnalysis({
      'order/created': {
        triggers: [{ functionId: 'handler', filePath: '/h.ts', line: 1 }],
        senders: [{ functionId: 'sender', filePath: '/s.ts', line: 5 }],
        waiters: [],
      },
    })
    expect(eventHasListener.checkProject(analysis)).toHaveLength(0)
  })

  it('reports warning when sent event has no listener', () => {
    const analysis = makeAnalysis({
      'order/created': {
        triggers: [],
        senders: [{ functionId: 'sender', filePath: '/s.ts', line: 5 }],
        waiters: [],
      },
    })
    const diags = eventHasListener.checkProject(analysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].ruleId).toBe('event-has-listener')
    expect(diags[0].message).toContain('order/created')
  })

  it('reports multiple warnings for multiple senders of unlistened event', () => {
    const analysis = makeAnalysis({
      'orphan/event': {
        triggers: [],
        senders: [
          { functionId: 'fn1', filePath: '/a.ts', line: 5 },
          { functionId: 'fn2', filePath: '/b.ts', line: 10 },
        ],
        waiters: [],
      },
    })
    const diags = eventHasListener.checkProject(analysis)
    expect(diags).toHaveLength(2)
  })

  it('ignores events that are only triggered (no senders)', () => {
    const analysis = makeAnalysis({
      'external/event': {
        triggers: [{ functionId: 'handler', filePath: '/h.ts', line: 1 }],
        senders: [],
        waiters: [],
      },
    })
    expect(eventHasListener.checkProject(analysis)).toHaveLength(0)
  })

  it('ignores events with only waiters', () => {
    const analysis = makeAnalysis({
      'wait/event': {
        triggers: [],
        senders: [],
        waiters: [{ functionId: 'waiter', filePath: '/w.ts', line: 1 }],
      },
    })
    expect(eventHasListener.checkProject(analysis)).toHaveLength(0)
  })
})
