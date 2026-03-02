import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

export const noNestedSteps: LintRule = {
  id: 'no-nested-steps',
  description: 'Disallow step calls inside other step callbacks',
  defaultSeverity: 'error',
  category: 'correctness',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    return fn.steps
      .filter((s) => s.depth > 0)
      .map((s) => ({
        ruleId: 'no-nested-steps',
        severity: 'error' as const,
        message: `Step "${s.id}" is nested inside step "${s.parentStepId}". Inngest steps must be flat — do not call step methods inside step.run callbacks.`,
        filePath: fn.filePath,
        line: s.line,
        column: s.column,
      }))
  },
}
