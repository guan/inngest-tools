import type { ProjectLintRule, LintDiagnostic } from '../types'
import type { ProjectAnalysis } from '@inngest-tools/core'

export const uniqueFunctionIds: ProjectLintRule = {
  id: 'unique-function-ids',
  description: 'Disallow duplicate function IDs across the project',
  defaultSeverity: 'error',
  category: 'correctness',

  checkProject(analysis: ProjectAnalysis): LintDiagnostic[] {
    const seen = new Map<string, { filePath: string; line: number }>()
    const diagnostics: LintDiagnostic[] = []

    for (const fn of analysis.functions) {
      const prev = seen.get(fn.id)
      if (prev) {
        diagnostics.push({
          ruleId: 'unique-function-ids',
          severity: 'error',
          message: `Duplicate function ID "${fn.id}". Also defined at ${prev.filePath}:${prev.line}. Inngest identifies functions by ID — duplicates will overwrite each other on deploy.`,
          filePath: fn.filePath,
          line: fn.line,
        })
      } else {
        seen.set(fn.id, { filePath: fn.filePath, line: fn.line })
      }
    }

    return diagnostics
  },
}
