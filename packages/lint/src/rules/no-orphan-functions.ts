import type { ProjectLintRule, LintDiagnostic } from '../types'
import type { ProjectAnalysis } from '@inngest-tools/core'

export const noOrphanFunctions: ProjectLintRule = {
  id: 'no-orphan-functions',
  description: 'Warn when an event-triggered function has no sender in the project',
  defaultSeverity: 'warning',
  category: 'best-practice',

  checkProject(analysis: ProjectAnalysis): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = []

    for (const fn of analysis.functions) {
      for (const trigger of fn.triggers) {
        if (trigger.type !== 'event' || !trigger.event || trigger.isDynamic) continue

        const entry = analysis.eventMap[trigger.event]
        if (!entry || entry.senders.length === 0) {
          diagnostics.push({
            ruleId: 'no-orphan-functions',
            severity: 'warning',
            message: `Function "${fn.id}" listens for "${trigger.event}" but no function in the project sends this event. It may be triggered externally (webhook, API) — if so, add the event to knownExternalEvents in config.`,
            filePath: fn.filePath,
            line: trigger.line,
          })
        }
      }
    }

    return diagnostics
  },
}
