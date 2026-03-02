import type { LintResult, LintDiagnostic, Severity } from '../types'

/**
 * ESLint 風のテキスト出力を生成する
 */
export function formatText(result: LintResult, options?: { colors?: boolean }): string {
  const useColors = options?.colors ?? true
  const lines: string[] = []

  // Group diagnostics by file
  const byFile = new Map<string, LintDiagnostic[]>()
  for (const diag of result.diagnostics) {
    const existing = byFile.get(diag.filePath) ?? []
    existing.push(diag)
    byFile.set(diag.filePath, existing)
  }

  for (const [filePath, diags] of byFile) {
    lines.push('')
    lines.push(useColors ? `\x1b[4m${filePath}\x1b[0m` : filePath)

    for (const diag of diags) {
      const location = `${diag.line}:${diag.column ?? 0}`
      const severity = formatSeverity(diag.severity, useColors)
      const padLocation = location.padEnd(8)
      const padSeverity = stripAnsi(severity).length < 8
        ? severity + ' '.repeat(8 - stripAnsi(severity).length)
        : severity
      lines.push(`  ${padLocation}  ${padSeverity}  ${diag.message}  ${useColors ? `\x1b[2m${diag.ruleId}\x1b[0m` : diag.ruleId}`)
    }
  }

  if (result.diagnostics.length > 0) {
    lines.push('')
    const parts: string[] = []
    if (result.summary.errors > 0) {
      parts.push(`${result.summary.errors} error${result.summary.errors !== 1 ? 's' : ''}`)
    }
    if (result.summary.warnings > 0) {
      parts.push(`${result.summary.warnings} warning${result.summary.warnings !== 1 ? 's' : ''}`)
    }
    if (result.summary.infos > 0) {
      parts.push(`${result.summary.infos} info${result.summary.infos !== 1 ? 's' : ''}`)
    }

    const summaryText = `✖ ${result.diagnostics.length} problem${result.diagnostics.length !== 1 ? 's' : ''} (${parts.join(', ')})`
    lines.push(useColors ? `\x1b[1m${summaryText}\x1b[0m` : summaryText)
  }

  return lines.join('\n')
}

function formatSeverity(severity: Severity, useColors: boolean): string {
  switch (severity) {
    case 'error':
      return useColors ? '\x1b[31merror\x1b[0m' : 'error'
    case 'warning':
      return useColors ? '\x1b[33mwarning\x1b[0m' : 'warning'
    case 'info':
      return useColors ? '\x1b[34minfo\x1b[0m' : 'info'
    default:
      return severity
  }
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}
