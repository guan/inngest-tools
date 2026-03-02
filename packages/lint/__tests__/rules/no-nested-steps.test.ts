import { describe, it, expect } from 'vitest'
import { noNestedSteps } from '../../src/rules/no-nested-steps'
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

describe('no-nested-steps', () => {
  it('reports no diagnostics for flat steps', () => {
    const fn = makeFn({
      steps: [
        { id: 'step1', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'step2', type: 'run', line: 10, column: 5, depth: 0 },
      ],
    })
    expect(noNestedSteps.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports error for nested step', () => {
    const fn = makeFn({
      steps: [
        { id: 'outer', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'inner', type: 'run', line: 6, column: 9, depth: 1, parentStepId: 'outer' },
      ],
    })
    const diags = noNestedSteps.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].ruleId).toBe('no-nested-steps')
    expect(diags[0].message).toContain('inner')
    expect(diags[0].message).toContain('outer')
  })

  it('reports errors for deeply nested steps', () => {
    const fn = makeFn({
      steps: [
        { id: 'level0', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'level1', type: 'run', line: 6, column: 9, depth: 1, parentStepId: 'level0' },
        { id: 'level2', type: 'run', line: 7, column: 13, depth: 2, parentStepId: 'level1' },
      ],
    })
    const diags = noNestedSteps.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(2)
  })

  it('reports no diagnostics for function with no steps', () => {
    const fn = makeFn({ steps: [] })
    expect(noNestedSteps.check(fn, emptyAnalysis)).toHaveLength(0)
  })

  it('reports error for waitForEvent inside step.run', () => {
    const fn = makeFn({
      steps: [
        { id: 'outer', type: 'run', line: 5, column: 5, depth: 0 },
        { id: 'wait', type: 'waitForEvent', line: 6, column: 9, depth: 1, parentStepId: 'outer' },
      ],
    })
    const diags = noNestedSteps.check(fn, emptyAnalysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('wait')
  })
})
