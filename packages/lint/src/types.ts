import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

export type Severity = 'error' | 'warning' | 'info' | 'off'

export interface LintRule {
  id: string
  description: string
  defaultSeverity: Severity
  category: 'correctness' | 'best-practice' | 'performance' | 'consistency'
  check(fn: InngestFunction, analysis: ProjectAnalysis): LintDiagnostic[]
}

export interface ProjectLintRule {
  id: string
  description: string
  defaultSeverity: Severity
  category: 'correctness' | 'best-practice' | 'performance' | 'consistency'
  checkProject(analysis: ProjectAnalysis): LintDiagnostic[]
}

export interface LintDiagnostic {
  ruleId: string
  severity: Severity
  message: string
  filePath: string
  line: number
  column?: number
  fix?: {
    description: string
    replacement?: string
  }
}

export interface LintResult {
  diagnostics: LintDiagnostic[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  lintTimeMs: number
}

export interface LintConfig {
  rules?: Record<string, Severity>
}
