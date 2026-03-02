import type { LintResult, LintDiagnostic, Severity } from '../types'

interface SarifLog {
  $schema: string
  version: string
  runs: SarifRun[]
}

interface SarifRun {
  tool: {
    driver: {
      name: string
      version: string
      informationUri: string
      rules: SarifRuleDescriptor[]
    }
  }
  results: SarifResult[]
}

interface SarifRuleDescriptor {
  id: string
  shortDescription: { text: string }
  defaultConfiguration: { level: string }
}

interface SarifResult {
  ruleId: string
  level: string
  message: { text: string }
  locations: SarifLocation[]
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string }
    region: { startLine: number; startColumn?: number }
  }
}

function severityToSarifLevel(severity: Severity): string {
  switch (severity) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'note'
    default:
      return 'none'
  }
}

/**
 * LintResult を SARIF 2.1.0 形式に変換する (GitHub Code Scanning 連携用)
 */
export function formatSarif(result: LintResult): string {
  // Collect unique rule IDs
  const ruleIds = [...new Set(result.diagnostics.map(d => d.ruleId))]

  const rules: SarifRuleDescriptor[] = ruleIds.map(id => {
    const diag = result.diagnostics.find(d => d.ruleId === id)!
    return {
      id,
      shortDescription: { text: `inngest-tools rule: ${id}` },
      defaultConfiguration: { level: severityToSarifLevel(diag.severity) },
    }
  })

  const results: SarifResult[] = result.diagnostics.map(diag => {
    // Project-level diagnostics may not have a real file path
    const uri = diag.filePath === '<project>' ? 'project' : diag.filePath
    return {
      ruleId: diag.ruleId,
      level: severityToSarifLevel(diag.severity),
      message: { text: diag.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri },
            region: {
              startLine: diag.line || 1,
              ...(diag.column !== undefined ? { startColumn: diag.column } : {}),
            },
          },
        },
      ],
    }
  })

  const sarif: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'inngest-tools',
            version: '0.1.0',
            informationUri: 'https://github.com/inngest/inngest-tools',
            rules,
          },
        },
        results,
      },
    ],
  }

  return JSON.stringify(sarif, null, 2)
}
