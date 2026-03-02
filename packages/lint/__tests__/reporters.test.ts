import { describe, it, expect } from 'vitest'
import { formatJson } from '../src/reporter/json'
import { formatSarif } from '../src/reporter/sarif'
import { formatText } from '../src/reporter/text'
import type { LintResult } from '../src/types'

const sampleResult: LintResult = {
  diagnostics: [
    {
      ruleId: 'no-nested-steps',
      severity: 'error',
      message: 'Nested step detected',
      filePath: 'src/functions.ts',
      line: 10,
      column: 5,
    },
    {
      ruleId: 'sleep-duration-warn',
      severity: 'warning',
      message: 'Sleep duration exceeds 7 days',
      filePath: 'src/functions.ts',
      line: 20,
    },
    {
      ruleId: 'event-has-listener',
      severity: 'warning',
      message: 'Event "user/signup" has no listener',
      filePath: 'src/other.ts',
      line: 5,
      column: 1,
    },
  ],
  summary: { errors: 1, warnings: 2, infos: 0 },
  lintTimeMs: 42,
}

const emptyResult: LintResult = {
  diagnostics: [],
  summary: { errors: 0, warnings: 0, infos: 0 },
  lintTimeMs: 5,
}

describe('formatJson', () => {
  it('produces valid JSON with all fields', () => {
    const output = formatJson(sampleResult)
    const parsed = JSON.parse(output)
    expect(parsed.diagnostics).toHaveLength(3)
    expect(parsed.summary.errors).toBe(1)
    expect(parsed.summary.warnings).toBe(2)
    expect(parsed.lintTimeMs).toBe(42)
  })

  it('supports pretty output', () => {
    const pretty = formatJson(sampleResult, { pretty: true })
    const compact = formatJson(sampleResult, { pretty: false })
    expect(pretty).toContain('\n')
    expect(compact).not.toContain('\n')
  })

  it('handles empty results', () => {
    const output = formatJson(emptyResult)
    const parsed = JSON.parse(output)
    expect(parsed.diagnostics).toHaveLength(0)
  })
})

describe('formatText', () => {
  it('formats diagnostics grouped by file', () => {
    const output = formatText(sampleResult, { colors: false })
    expect(output).toContain('src/functions.ts')
    expect(output).toContain('src/other.ts')
    expect(output).toContain('Nested step detected')
  })

  it('shows severity labels', () => {
    const output = formatText(sampleResult, { colors: false })
    expect(output).toContain('error')
    expect(output).toContain('warning')
  })

  it('shows summary with problem count', () => {
    const output = formatText(sampleResult, { colors: false })
    expect(output).toContain('3 problems')
    expect(output).toContain('1 error')
    expect(output).toContain('2 warnings')
  })

  it('returns empty for no diagnostics', () => {
    const output = formatText(emptyResult, { colors: false })
    expect(output.trim()).toBe('')
  })

  it('includes rule IDs', () => {
    const output = formatText(sampleResult, { colors: false })
    expect(output).toContain('no-nested-steps')
    expect(output).toContain('sleep-duration-warn')
  })

  it('shows location as line:column', () => {
    const output = formatText(sampleResult, { colors: false })
    expect(output).toContain('10:5')
    expect(output).toContain('20:0')
  })
})

describe('formatSarif', () => {
  it('produces valid SARIF 2.1.0 structure', () => {
    const output = formatSarif(sampleResult)
    const sarif = JSON.parse(output)
    expect(sarif.$schema).toContain('sarif-schema-2.1.0')
    expect(sarif.version).toBe('2.1.0')
    expect(sarif.runs).toHaveLength(1)
  })

  it('includes tool driver info', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const driver = sarif.runs[0].tool.driver
    expect(driver.name).toBe('inngest-tools')
    expect(driver.version).toBe('0.1.0')
  })

  it('maps diagnostics to results', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const results = sarif.runs[0].results
    expect(results).toHaveLength(3)
    expect(results[0].ruleId).toBe('no-nested-steps')
    expect(results[0].level).toBe('error')
    expect(results[1].level).toBe('warning')
  })

  it('maps severity to SARIF levels', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const results = sarif.runs[0].results
    expect(results[0].level).toBe('error')
    expect(results[1].level).toBe('warning')
  })

  it('includes physical locations', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const loc = sarif.runs[0].results[0].locations[0].physicalLocation
    expect(loc.artifactLocation.uri).toBe('src/functions.ts')
    expect(loc.region.startLine).toBe(10)
    expect(loc.region.startColumn).toBe(5)
  })

  it('omits column when not present', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const loc = sarif.runs[0].results[1].locations[0].physicalLocation
    expect(loc.region.startLine).toBe(20)
    expect(loc.region.startColumn).toBeUndefined()
  })

  it('collects unique rule descriptors', () => {
    const sarif = JSON.parse(formatSarif(sampleResult))
    const rules = sarif.runs[0].tool.driver.rules
    expect(rules).toHaveLength(3)
    expect(rules.map((r: { id: string }) => r.id)).toEqual([
      'no-nested-steps',
      'sleep-duration-warn',
      'event-has-listener',
    ])
  })

  it('handles empty diagnostics', () => {
    const sarif = JSON.parse(formatSarif(emptyResult))
    expect(sarif.runs[0].results).toHaveLength(0)
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0)
  })
})
