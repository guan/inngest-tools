import { describe, it, expect } from 'vitest'
import { uniqueFunctionIds } from '../../src/rules/unique-function-ids'
import type { ProjectAnalysis, InngestFunction } from '@inngest-tools/core'

function makeFn(id: string, filePath: string, line: number): InngestFunction {
  return {
    id,
    filePath,
    relativePath: filePath,
    line,
    column: 1,
    triggers: [],
    steps: [],
    sends: [],
    waitsFor: [],
    config: {},
  }
}

function makeAnalysis(functions: InngestFunction[]): ProjectAnalysis {
  return {
    functions,
    eventMap: {},
    diagnostics: [],
    analyzedFiles: functions.length,
    analysisTimeMs: 0,
  }
}

describe('unique-function-ids', () => {
  it('reports no diagnostics for unique function IDs', () => {
    const analysis = makeAnalysis([
      makeFn('fn-a', '/a.ts', 1),
      makeFn('fn-b', '/b.ts', 1),
      makeFn('fn-c', '/c.ts', 1),
    ])
    expect(uniqueFunctionIds.checkProject(analysis)).toHaveLength(0)
  })

  it('reports error for duplicate function IDs', () => {
    const analysis = makeAnalysis([
      makeFn('my-fn', '/a.ts', 5),
      makeFn('my-fn', '/b.ts', 10),
    ])
    const diags = uniqueFunctionIds.checkProject(analysis)
    expect(diags).toHaveLength(1)
    expect(diags[0].message).toContain('my-fn')
    expect(diags[0].filePath).toBe('/b.ts')
  })

  it('reports multiple duplicates of different IDs', () => {
    const analysis = makeAnalysis([
      makeFn('fn-a', '/a.ts', 1),
      makeFn('fn-a', '/b.ts', 1),
      makeFn('fn-b', '/c.ts', 1),
      makeFn('fn-b', '/d.ts', 1),
    ])
    const diags = uniqueFunctionIds.checkProject(analysis)
    expect(diags).toHaveLength(2)
  })

  it('reports no diagnostics for empty project', () => {
    const analysis = makeAnalysis([])
    expect(uniqueFunctionIds.checkProject(analysis)).toHaveLength(0)
  })

  it('reports no diagnostics for single function', () => {
    const analysis = makeAnalysis([makeFn('fn-a', '/a.ts', 1)])
    expect(uniqueFunctionIds.checkProject(analysis)).toHaveLength(0)
  })
})
