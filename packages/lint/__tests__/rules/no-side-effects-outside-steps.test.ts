import { describe, it, expect } from 'vitest'
import { noSideEffectsOutsideSteps } from '../../src/rules/no-side-effects-outside-steps'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

const emptyAnalysis: ProjectAnalysis = {
  functions: [],
  eventMap: {},
  diagnostics: [],
  analyzedFiles: 0,
  analysisTimeMs: 0,
}

function makeFn(overrides: Partial<InngestFunction> = {}): InngestFunction {
  return {
    id: 'test-fn',
    filePath: '/test.ts',
    relativePath: 'test.ts',
    line: 1,
    column: 1,
    triggers: [{ type: 'event', event: 'test/event', isDynamic: false, line: 1 }],
    steps: [],
    sends: [],
    waitsFor: [],
    config: {},
    ...overrides,
  }
}

describe('no-side-effects-outside-steps', () => {
  it('reports warning for event-triggered function with no steps', () => {
    const fn = makeFn({ steps: [] })
    const diags = noSideEffectsOutsideSteps.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].ruleId).toBe('no-side-effects-outside-steps')
  })

  it('reports no diagnostics for function with steps', () => {
    const fn = makeFn({
      steps: [{ id: 'step1', type: 'run', line: 5, column: 5, depth: 0 }],
    })
    expect(noSideEffectsOutsideSteps.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('skips cron-triggered functions', () => {
    const fn = makeFn({
      triggers: [{ type: 'cron', cron: '* * * * *', line: 1 }],
      steps: [],
    })
    expect(noSideEffectsOutsideSteps.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('checks event-triggered function even with cron also present', () => {
    const fn = makeFn({
      triggers: [
        { type: 'cron', cron: '* * * * *', line: 1 },
        { type: 'event', event: 'test/event', isDynamic: false, line: 2 },
      ],
      steps: [],
    })
    const diags = noSideEffectsOutsideSteps.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
  })

  it('reports no diagnostics for function with only sleep step', () => {
    const fn = makeFn({
      steps: [{ id: 'wait', type: 'sleep', line: 5, column: 5, depth: 0, duration: '1h' }],
    })
    expect(noSideEffectsOutsideSteps.check(fn, emptyAnalysis)).toHaveLength(0)
  })
})
