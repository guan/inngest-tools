import { describe, it, expect } from 'vitest'
import { lint } from '../src/engine'
import type { LintRule, ProjectLintRule } from '../src/types'
import type { ProjectAnalysis, InngestFunction } from '@inngest-tools/core'

function makeAnalysis(functions: InngestFunction[]): ProjectAnalysis {
  return {
    functions,
    eventMap: {},
    diagnostics: [],
    analyzedFiles: 1,
    analysisTimeMs: 0,
  }
}

function makeFn(id: string): InngestFunction {
  return {
    id,
    filePath: '/src/test.ts',
    relativePath: 'src/test.ts',
    line: 1,
    column: 1,
    triggers: [{ type: 'event', event: 'test/event', isDynamic: false, line: 1 }],
    steps: [],
    sends: [],
    waitsFor: [],
    config: {},
  }
}

describe('lint engine error boundaries', () => {
  it('catches per-function rule crashes and reports them as diagnostics', () => {
    const crashingRule: LintRule = {
      id: 'crashing-rule',
      description: 'A rule that always throws',
      defaultSeverity: 'error',
      category: 'correctness',
      check() {
        throw new Error('Rule exploded!')
      },
    }

    const analysis = makeAnalysis([makeFn('test-fn')])
    const result = lint(analysis, [crashingRule], [])

    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].ruleId).toBe('crashing-rule')
    expect(result.diagnostics[0].severity).toBe('error')
    expect(result.diagnostics[0].message).toContain('crashed')
    expect(result.diagnostics[0].message).toContain('Rule exploded!')
  })

  it('catches project rule crashes and reports them as diagnostics', () => {
    const crashingProjectRule: ProjectLintRule = {
      id: 'crashing-project-rule',
      description: 'A project rule that always throws',
      defaultSeverity: 'warning',
      category: 'correctness',
      checkProject() {
        throw new Error('Project rule exploded!')
      },
    }

    const analysis = makeAnalysis([makeFn('test-fn')])
    const result = lint(analysis, [], [crashingProjectRule])

    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].ruleId).toBe('crashing-project-rule')
    expect(result.diagnostics[0].message).toContain('Project rule exploded!')
  })

  it('continues processing other rules after a crash', () => {
    const crashingRule: LintRule = {
      id: 'crasher',
      description: 'Crashes',
      defaultSeverity: 'error',
      category: 'correctness',
      check() {
        throw new Error('crash')
      },
    }

    const workingRule: LintRule = {
      id: 'worker',
      description: 'Works fine',
      defaultSeverity: 'warning',
      category: 'correctness',
      check(fn) {
        return [
          {
            ruleId: 'worker',
            severity: 'warning',
            message: `Checked ${fn.id}`,
            filePath: fn.filePath,
            line: fn.line,
          },
        ]
      },
    }

    const analysis = makeAnalysis([makeFn('test-fn')])
    const result = lint(analysis, [crashingRule, workingRule], [])

    expect(result.diagnostics).toHaveLength(2)
    const crashDiag = result.diagnostics.find(d => d.ruleId === 'crasher')
    const workDiag = result.diagnostics.find(d => d.ruleId === 'worker')
    expect(crashDiag).toBeDefined()
    expect(workDiag).toBeDefined()
    expect(workDiag!.message).toContain('Checked test-fn')
  })

  it('handles non-Error throws', () => {
    const crashingRule: LintRule = {
      id: 'string-thrower',
      description: 'Throws a string',
      defaultSeverity: 'error',
      category: 'correctness',
      check() {
        throw 'string error'
      },
    }

    const analysis = makeAnalysis([makeFn('test-fn')])
    const result = lint(analysis, [crashingRule], [])

    expect(result.diagnostics).toHaveLength(1)
    expect(result.diagnostics[0].message).toContain('string error')
  })
})
