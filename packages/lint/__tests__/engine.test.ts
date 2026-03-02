import { describe, it, expect } from 'vitest'
import * as path from 'node:path'
import { analyzeProject } from '@inngest-tools/core'
import { lint, builtinRules, builtinProjectRules } from '../src/index'

const FIXTURES_DIR = path.join(__dirname, '../../core/__tests__/fixtures')

describe('lint engine integration', () => {
  it('detects nested steps in nested-steps fixture', () => {
    const analysis = analyzeProject(FIXTURES_DIR, {
      include: ['nested-steps.ts'],
    })

    const result = lint(analysis, builtinRules, builtinProjectRules)
    const nestedDiags = result.diagnostics.filter((d) => d.ruleId === 'no-nested-steps')
    expect(nestedDiags.length).toBeGreaterThan(0)
    expect(nestedDiags[0].severity).toBe('error')
  })

  it('reports no errors for clean fixture', () => {
    const analysis = analyzeProject(FIXTURES_DIR, {
      include: ['simple-function.ts'],
    })

    const result = lint(analysis, builtinRules, builtinProjectRules)
    expect(result.summary.errors).toBe(0)
  })

  it('respects severity overrides', () => {
    const analysis = analyzeProject(FIXTURES_DIR, {
      include: ['nested-steps.ts'],
    })

    const result = lint(analysis, builtinRules, builtinProjectRules, {
      rules: { 'no-nested-steps': 'off' },
    })

    const nestedDiags = result.diagnostics.filter((d) => d.ruleId === 'no-nested-steps')
    expect(nestedDiags).toHaveLength(0)
  })

  it('sorts diagnostics by file and line', () => {
    const analysis = analyzeProject(FIXTURES_DIR)
    const result = lint(analysis, builtinRules, builtinProjectRules)

    for (let i = 1; i < result.diagnostics.length; i++) {
      const prev = result.diagnostics[i - 1]
      const curr = result.diagnostics[i]
      const cmp = prev.filePath.localeCompare(curr.filePath)
      if (cmp === 0) {
        expect(prev.line).toBeLessThanOrEqual(curr.line)
      }
    }
  })

  it('computes correct summary', () => {
    const analysis = analyzeProject(FIXTURES_DIR, {
      include: ['nested-steps.ts'],
    })

    const result = lint(analysis, builtinRules, builtinProjectRules)
    expect(result.summary.errors).toBe(result.diagnostics.filter((d) => d.severity === 'error').length)
    expect(result.summary.warnings).toBe(result.diagnostics.filter((d) => d.severity === 'warning').length)
  })
})
