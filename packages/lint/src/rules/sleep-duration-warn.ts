import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'
import { parseDuration } from '@inngest-tools/core'

const DEFAULT_MAX_DAYS = 7
const SECONDS_PER_DAY = 86400

export const sleepDurationWarn: LintRule = {
  id: 'sleep-duration-warn',
  description: 'Warn when step.sleep() duration exceeds a threshold',
  defaultSeverity: 'warning',
  category: 'performance',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = []
    const maxSeconds = DEFAULT_MAX_DAYS * SECONDS_PER_DAY

    for (const step of fn.steps) {
      if (step.type !== 'sleep' || !step.duration) continue

      const seconds = parseDuration(step.duration)
      if (seconds === null) continue

      if (seconds > maxSeconds) {
        const days = Math.round(seconds / SECONDS_PER_DAY)
        diagnostics.push({
          ruleId: 'sleep-duration-warn',
          severity: 'warning',
          message: `step.sleep "${step.id}" has duration "${step.duration}" (~${days} days) which exceeds the ${DEFAULT_MAX_DAYS}-day threshold. This may indicate a design issue — consider using step.waitForEvent or a cron trigger instead.`,
          filePath: fn.filePath,
          line: step.line,
          column: step.column,
        })
      }
    }

    return diagnostics
  },
}
