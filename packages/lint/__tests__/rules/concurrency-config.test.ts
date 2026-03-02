import { describe, it, expect } from 'vitest'
import { concurrencyConfig } from '../../src/rules/concurrency-config'
import type { InngestFunction, ProjectAnalysis, FunctionConfig } from '@inngest-tools/core'

function makeFn(config: FunctionConfig): InngestFunction {
  return {
    id: 'test-fn',
    filePath: '/test.ts',
    relativePath: 'test.ts',
    line: 1,
    column: 1,
    triggers: [],
    steps: [],
    sends: [],
    waitsFor: [],
    config,
  }
}

const emptyAnalysis: ProjectAnalysis = {
  functions: [],
  eventMap: {},
  diagnostics: [],
  analyzedFiles: 0,
  analysisTimeMs: 0,
}

describe('concurrency-config', () => {
  it('reports no diagnostics for valid config', () => {
    const fn = makeFn({
      concurrency: { limit: 5 },
      throttle: { limit: 10, period: '1m' },
      retries: 3,
    })
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports warning for zero concurrency limit', () => {
    const fn = makeFn({ concurrency: { limit: 0 } })
    const diags = concurrencyConfig.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('concurrency limit 0')
  })

  it('reports warning for negative concurrency limit', () => {
    const fn = makeFn({ concurrency: { limit: -1 } })
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(1)
  })

  it('reports warning for zero throttle limit', () => {
    const fn = makeFn({ throttle: { limit: 0 } })
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(1)
  })

  it('reports warning for negative retries', () => {
    const fn = makeFn({ retries: -1 })
    const diags = concurrencyConfig.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('retries -1')
  })

  it('allows zero retries', () => {
    const fn = makeFn({ retries: 0 })
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports warning for zero batchEvents.maxSize', () => {
    const fn = makeFn({ batchEvents: { maxSize: 0 } })
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(1)
  })

  it('reports no diagnostics for empty config', () => {
    const fn = makeFn({})
    expect(concurrencyConfig.check(fn, emptyAnalysis)).toHaveLength(0)
  })
})
