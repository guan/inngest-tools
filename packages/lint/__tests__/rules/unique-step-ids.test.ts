import { describe, it, expect } from 'vitest'
import { uniqueStepIds } from '../../src/rules/unique-step-ids'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

function makeFn(overrides: Partial<InngestFunction> = {}): InngestFunction {
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
    config: {},
    ...overrides,
  }
}

const emptyAnalysis: ProjectAnalysis = {
  functions: [],
  eventMap: {},
  diagnostics: [],
  analyzedFiles: 0,
  analysisTimeMs: 0,
}

describe('unique-step-ids', () => {
  it('reports no diagnostics for unique step IDs', () => {
    const fn = makeFn({
      steps: [
        { id: 'step1', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'step2', type: 'run', line: 10, column: 5, depth: 0 },
        { id: 'step3', type: 'sleep', line: 15, column: 5, depth: 0 },
      ],
    })
    expect(uniqueStepIds.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports error for duplicate step IDs', () => {
    const fn = makeFn({
      steps: [
        { id: 'process', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'process', type: 'run', line: 10, column: 5, depth: 0 },
      ],
    })
    const diags = uniqueStepIds.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('process')
    expect(diags[0].message).toContain('line 5')
  })

  it('reports multiple duplicates', () => {
    const fn = makeFn({
      steps: [
        { id: 'a', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'a', type: 'run', line: 10, column: 5, depth: 0 },
        { id: 'a', type: 'run', line: 15, column: 5, depth: 0 },
      ],
    })
    const diags = uniqueStepIds.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(2) // 2nd and 3rd occurrences
  })

  it('reports no diagnostics for empty steps', () => {
    const fn = makeFn({ steps: [] })
    expect(uniqueStepIds.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports no diagnostics for single step', () => {
    const fn = makeFn({
      steps: [{ id: 'only', type: 'run', line: 5, column: 5, depth: 0 }],
    })
    expect(uniqueStepIds.check(fn, emptyAnalysis)).toHaveLength(0)
  })
})
