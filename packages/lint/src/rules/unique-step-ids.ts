import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

export const uniqueStepIds: LintRule = {
  id: 'unique-step-ids',
  description: 'Disallow duplicate step IDs within a single function',
  defaultSeverity: 'error',
  category: 'correctness',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    const seen = new Map<string, number>()
    const diagnostics: LintDiagnostic[] = []

    for (const step of fn.steps) {
      const prevLine = seen.get(step.id)
      if (prevLine !== undefined) {
        diagnostics.push({
          ruleId: 'unique-step-ids',
          severity: 'error',
          message: `Duplicate step ID "${step.id}" in function "${fn.id}". First defined at line ${prevLine}. Inngest uses step IDs for memoization — duplicates will cause state overwrites.`,
          filePath: fn.filePath,
          line: step.line,
          column: step.column,
        })
      } else {
        seen.set(step.id, step.line)
      }
    }

    return diagnostics
  },
}
