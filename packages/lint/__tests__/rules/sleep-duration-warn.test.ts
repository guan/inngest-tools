import { describe, it, expect } from 'vitest'
import { sleepDurationWarn } from '../../src/rules/sleep-duration-warn'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

function makeFn(sleepDuration: string): InngestFunction {
  return {
    id: 'test-fn',
    filePath: '/test.ts',
    relativePath: 'test.ts',
    line: 1,
    column: 1,
    triggers: [],
    steps: [
      { id: 'wait', type: 'sleep', line: 5, column: 5, depth: 0, duration: sleepDuration },
    ],
    sends: [],
    waitsFor: [],
    config: {},
  }
}

const emptyAnalysis: ProjectAnalysis = {
  functions: [],
  eventMap: {},
  diagnostics: [],
  analyzedFiles: 0,
  analysisTimeMs: 0,
}

describe('sleep-duration-warn', () => {
  it('reports no diagnostics for short sleep', () => {
    expect(sleepDurationWarn.check(makeFn('1h'), emptyAnalysis)).toHaveLength(0)
  })

  it('reports no diagnostics for 7-day sleep', () => {
    expect(sleepDurationWarn.check(makeFn('7d'), emptyAnalysis)).toHaveLength(0)
  })

  it('reports warning for sleep exceeding 7 days', () => {
    const diags = sleepDurationWarn.check(makeFn('30d'), emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].ruleId).toBe('sleep-duration-warn')
    expect(diags[0].message).toContain('30d')
  })

  it('reports warning for very long sleep in hours', () => {
    const diags = sleepDurationWarn.check(makeFn('200h'), emptyAnalysis)
    expect(diags).toHaveLength(1)
  })

  it('reports no diagnostics for non-sleep steps', () => {
    const fn: InngestFunction = {
      id: 'test-fn',
      filePath: '/test.ts',
      relativePath: 'test.ts',
      line: 1,
      column: 1,
      triggers: [],
      steps: [{ id: 'run', type: 'run', line: 5, column: 5, depth: 0 }],
      sends: [],
      waitsFor: [],
      config: {},
    }
    expect(sleepDurationWarn.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('ignores sleep with unparseable duration', () => {
    expect(sleepDurationWarn.check(makeFn('unknown'), emptyAnalysis)).toHaveLength(0)
  })
})
