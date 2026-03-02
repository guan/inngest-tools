import type { ProjectLintRule, LintDiagnostic } from '../types'
import type { ProjectAnalysis } from '@inngest-tools/core'

export const eventHasListener: ProjectLintRule = {
  id: 'event-has-listener',
  description: 'Warn when a sent event has no function listening for it',
  defaultSeverity: 'warning',
  category: 'best-practice',

  checkProject(analysis: ProjectAnalysis): LintDiagnostic[] {
    const diagnostics: LintDiagnostic[] = []

    for (const [eventName, entry] of Object.entries(analysis.eventMap)) {
      if (entry.senders.length > 0 && entry.triggers.length === 0) {
        for (const sender of entry.senders) {
          diagnostics.push({
            ruleId: 'event-has-listener',
            severity: 'warning',
            message: `Event "${eventName}" is sent but no function listens for it. Either add a function with this event trigger or remove the send.`,
            filePath: sender.filePath,
            line: sender.line,
          })
        }
      }
    }

    return diagnostics
  },
}
