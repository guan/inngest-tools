import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

export const noSideEffectsOutsideSteps: LintRule = {
  id: 'no-side-effects-outside-steps',
  description: 'Warn about potential side effects outside step.run() callbacks',
  defaultSeverity: 'warning',
  category: 'best-practice',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    // This rule uses heuristic analysis based on step metadata.
    // Since we don't have direct AST access in the lint rule,
    // we check if the function has any steps at all.
    // If a function has steps but also has top-level await expressions
    // outside steps, that's a potential issue.
    //
    // For Phase 3, this is a simplified version that warns when
    // a function has no steps at all but is event-triggered,
    // which could indicate all logic is running outside steps.
    const diagnostics: LintDiagnostic[] = []

    // Only check event-triggered functions (cron functions may legitimately have no steps)
    const hasEventTrigger = fn.triggers.some((t) => t.type === 'event')
    if (!hasEventTrigger) return diagnostics

    if (fn.steps.length === 0) {
      diagnostics.push({
        ruleId: 'no-side-effects-outside-steps',
        severity: 'warning',
        message: `Function "${fn.id}" has no step calls. All logic runs outside steps and will be re-executed on every retry. Wrap side effects in step.run() for reliable execution.`,
        filePath: fn.filePath,
        line: fn.line,
      })
    }

    return diagnostics
  },
}
