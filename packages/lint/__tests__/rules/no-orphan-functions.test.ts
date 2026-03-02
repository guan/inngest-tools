import { describe, it, expect } from 'vitest'
import { noOrphanFunctions } from '../../src/rules/no-orphan-functions'
import type { ProjectAnalysis, InngestFunction } from '@inngest-tools/core'

function makeFn(id: string, eventName: string): InngestFunction {
  return {
    id,
    filePath: `/${id}.ts`,
    relativePath: `${id}.ts`,
    line: 1,
    column: 1,
    triggers: [{ type: 'event', event: eventName, isDynamic: false, line: 1 }],
    steps: [],
    sends: [],
    waitsFor: [],
    config: {},
  }
}

describe('no-orphan-functions', () => {
  it('reports no diagnostics when event has a sender', () => {
    const analysis: ProjectAnalysis = {
      functions: [makeFn('handler', 'order/created')],
      eventMap: {
        'order/created': {
          triggers: [{ functionId: 'handler', filePath: '/handler.ts', line: 1 }],
          senders: [{ functionId: 'sender', filePath: '/sender.ts', line: 5 }],
          waiters: [],
        },
      },
      diagnostics: [],
      analyzedFiles: 2,
      analysisTimeMs: 0,
    }
    expect(noOrphanFunctions.checkProject(analysis)).toHaveLength(0)
  })

  it('reports warning when event-triggered function has no sender', () => {
    const analysis: ProjectAnalysis = {
      functions: [makeFn('handler', 'order/created')],
      eventMap: {
        'order/created': {
          triggers: [{ functionId: 'handler', filePath: '/handler.ts', line: 1 }],
          senders: [],
          waiters: [],
        },
      },
      diagnostics: [],
      analyzedFiles: 1,
      analysisTimeMs: 0,
    }
    const diags = noOrphanFunctions.checkProject(analysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('handler')
    expect(diags[0].message).toContain('order/created')
  })

  it('skips cron-triggered functions', () => {
    const fn: InngestFunction = {
      id: 'cron-fn',
      filePath: '/cron.ts',
      relativePath: 'cron.ts',
      line: 1,
      column: 1,
      triggers: [{ type: 'cron', cron: '0 * * * *', line: 1 }],
      steps: [],
      sends: [],
      waitsFor: [],
      config: {},
    }
    const analysis: ProjectAnalysis = {
      functions: [fn],
      eventMap: {},
      diagnostics: [],
      analyzedFiles: 1,
      analysisTimeMs: 0,
    }
    expect(noOrphanFunctions.checkProject(analysis)).toHaveLength(0)
  })

  it('skips dynamic event triggers', () => {
    const fn: InngestFunction = {
      id: 'dynamic-fn',
      filePath: '/dynamic.ts',
      relativePath: 'dynamic.ts',
      line: 1,
      column: 1,
      triggers: [{ type: 'event', event: null, isDynamic: true, rawExpression: 'variable', line: 1 }],
      steps: [],
      sends: [],
      waitsFor: [],
      config: {},
    }
    const analysis: ProjectAnalysis = {
      functions: [fn],
      eventMap: {},
      diagnostics: [],
      analyzedFiles: 1,
      analysisTimeMs: 0,
    }
    expect(noOrphanFunctions.checkProject(analysis)).toHaveLength(0)
  })

  it('reports warning when event is not in eventMap at all', () => {
    const analysis: ProjectAnalysis = {
      functions: [makeFn('handler', 'order/created')],
      eventMap: {},
      diagnostics: [],
      analyzedFiles: 1,
      analysisTimeMs: 0,
    }
    const diags = noOrphanFunctions.checkProject(analysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('handler')
    expect(diags[0].message).toContain('order/created')
  })

  it('reports multiple orphan functions', () => {
    const analysis: ProjectAnalysis = {
      functions: [makeFn('fn1', 'event/a'), makeFn('fn2', 'event/b')],
      eventMap: {
        'event/a': {
          triggers: [{ functionId: 'fn1', filePath: '/fn1.ts', line: 1 }],
          senders: [],
          waiters: [],
        },
        'event/b': {
          triggers: [{ functionId: 'fn2', filePath: '/fn2.ts', line: 1 }],
          senders: [],
          waiters: [],
        },
      },
      diagnostics: [],
      analyzedFiles: 2,
      analysisTimeMs: 0,
    }
    expect(noOrphanFunctions.checkProject(analysis)).toHaveLength(2)
  })
})
