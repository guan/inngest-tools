import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'
import { parseExpression } from 'cron-parser'

export const validCron: LintRule = {
  id: 'valid-cron',
  description: 'Validate cron trigger expressions',
  defaultSeverity: 'error',
  category: 'correctness',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = []

    for (const trigger of fn.triggers) {
      if (trigger.type !== 'cron') continue

      try {
        parseExpression(trigger.cron)
      } catch (e) {
        diagnostics.push({
          ruleId: 'valid-cron',
          severity: 'error',
          message: `Invalid cron expression "${trigger.cron}": ${e instanceof Error ? e.message : 'unknown error'}`,
          filePath: fn.filePath,
          line: trigger.line,
        })
      }
    }

    return diagnostics
  },
}
