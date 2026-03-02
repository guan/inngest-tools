import type { ProjectAnalysis } from '@inngest-tools/core'
import type {
  LintRule,
  ProjectLintRule,
  LintDiagnostic,
  LintResult,
  LintConfig,
  Severity,
} from './types'

/**
 * Lint エンジン: ルールを実行して結果を収集する
 */
export function lint(
  analysis: ProjectAnalysis,
  rules: LintRule[],
  projectRules: ProjectLintRule[],
  config?: LintConfig
): LintResult {
  const startTime = Date.now()
  const diagnostics: LintDiagnostic[] = []

  const severityOverrides = config?.rules ?? {}

  // Run per-function rules
  for (const fn of analysis.functions) {
    for (const rule of rules) {
      const severity = severityOverrides[rule.id] ?? rule.defaultSeverity
      if (severity === 'off') continue

      try {
        const results = rule.check(fn, analysis)
        for (const diag of results) {
          diagnostics.push({ ...diag, severity })
        }
      } catch (e) {
        diagnostics.push({
          ruleId: rule.id,
          severity: 'error',
          message: `Rule "${rule.id}" crashed: ${e instanceof Error ? e.message : String(e)}`,
          filePath: fn.filePath,
          line: fn.line,
        })
      }
    }
  }

  // Run project-level rules
  for (const rule of projectRules) {
    const severity = severityOverrides[rule.id] ?? rule.defaultSeverity
    if (severity === 'off') continue

    try {
      const results = rule.checkProject(analysis)
      for (const diag of results) {
        diagnostics.push({ ...diag, severity })
      }
    } catch (e) {
      diagnostics.push({
        ruleId: rule.id,
        severity: 'error',
        message: `Rule "${rule.id}" crashed: ${e instanceof Error ? e.message : String(e)}`,
        filePath: 'project',
        line: 1,
      })
    }
  }

  // Sort by file path, then line number
  diagnostics.sort((a, b) => {
    const fileCompare = a.filePath.localeCompare(b.filePath)
    if (fileCompare !== 0) return fileCompare
    return a.line - b.line
  })

  return {
    diagnostics,
    summary: {
      errors: diagnostics.filter((d) => d.severity === 'error').length,
      warnings: diagnostics.filter((d) => d.severity === 'warning').length,
      infos: diagnostics.filter((d) => d.severity === 'info').length,
    },
    lintTimeMs: Date.now() - startTime,
  }
}
