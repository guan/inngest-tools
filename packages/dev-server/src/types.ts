import type { ProjectAnalysis } from '@inngest-tools/core'
import type { VizGraph } from '@inngest-tools/viz'
import type { LintResult, LintConfig } from '@inngest-tools/lint'

export interface DevServerOptions {
  targetDir: string
  port?: number
  host?: string
  debounceMs?: number
  ignore?: string[]
  tsConfigPath?: string
  lintConfig?: LintConfig
  open?: boolean
}

export interface DashboardState {
  analysis: ProjectAnalysis | null
  graph: VizGraph | null
  lintResult: LintResult | null
  lastAnalyzedAt: string | null
  analyzing: boolean
  error: string | null
  targetDir: string
}

export type SSEEvent =
  | { type: 'state'; data: DashboardState }
  | { type: 'analyzing'; data: { startedAt: string } }
  | { type: 'analyzed'; data: DashboardState }
  | { type: 'error'; data: { message: string } }

export interface DevServerHandle {
  url: string
  close(): Promise<void>
  triggerAnalysis(): void
}
