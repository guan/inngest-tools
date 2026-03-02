import { describe, it, expect } from 'vitest'
import { validCron } from '../../src/rules/valid-cron'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

function makeFn(cron: string): InngestFunction {
  return {
    id: 'cron-fn',
    filePath: '/cron.ts',
    relativePath: 'cron.ts',
    line: 1,
    column: 1,
    triggers: [{ type: 'cron', cron, line: 1 }],
    steps: [],
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

describe('valid-cron', () => {
  it('accepts valid 5-field cron expression', () => {
    expect(validCron.check(makeFn('0 3 * * *'), emptyAnalysis)).toHaveLength(0)
  })

  it('accepts every-minute cron', () => {
    expect(validCron.check(makeFn('* * * * *'), emptyAnalysis)).toHaveLength(0)
  })

  it('accepts complex cron expression', () => {
    expect(validCron.check(makeFn('0 0 1,15 * *'), emptyAnalysis)).toHaveLength(0)
  })

  it('reports error for invalid cron expression', () => {
    const diags = validCron.check(makeFn('invalid cron'), emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].ruleId).toBe('valid-cron')
    expect(diags[0].message).toContain('invalid cron')
  })

  it('reports error for cron with too few fields', () => {
    const diags = validCron.check(makeFn('0 3 *'), emptyAnalysis)
    expect(diags).toHaveLength(1)
  })

  it('reports no diagnostics for function with event trigger', () => {
    const fn: InngestFunction = {
      id: 'event-fn',
      filePath: '/event.ts',
      relativePath: 'event.ts',
      line: 1,
      column: 1,
      triggers: [{ type: 'event', event: 'test/event', isDynamic: false, line: 1 }],
      steps: [],
      sends: [],
      waitsFor: [],
      config: {},
    }
    expect(validCron.check(fn, emptyAnalysis)).toHaveLength(0)
  })
})
