import { analyzeProject } from '@inngest-tools/core'
import type { AnalyzeOptions } from '@inngest-tools/core'
import { buildGraph } from '@inngest-tools/viz'
import { lint, builtinRules, builtinProjectRules } from '@inngest-tools/lint'
import type { LintConfig } from '@inngest-tools/lint'
import type { DashboardState } from './types'
import type { SSEManager } from './sse'

export interface AnalyzerOptions {
  targetDir: string
  analyzeOptions?: AnalyzeOptions
  lintConfig?: LintConfig
  sse: SSEManager
}

export class Analyzer {
  private state: DashboardState
  private options: AnalyzerOptions
  private running = false

  constructor(options: AnalyzerOptions) {
    this.options = options
    this.state = {
      analysis: null,
      graph: null,
      lintResult: null,
      lastAnalyzedAt: null,
      analyzing: false,
      error: null,
      targetDir: options.targetDir,
    }
  }

  getState(): DashboardState {
    return this.state
  }

  analyze(): void {
    if (this.running) return
    this.running = true

    this.state.analyzing = true
    this.state.error = null
    this.options.sse.broadcast({
      type: 'analyzing',
      data: { startedAt: new Date().toISOString() },
    })

    try {
      const analysis = analyzeProject(
        this.options.targetDir,
        this.options.analyzeOptions
      )
      const graph = buildGraph(analysis)
      const lintResult = lint(
        analysis,
        builtinRules,
        builtinProjectRules,
        this.options.lintConfig
      )

      this.state.analysis = analysis
      this.state.graph = graph
      this.state.lintResult = lintResult
      this.state.lastAnalyzedAt = new Date().toISOString()
      this.state.analyzing = false

      this.options.sse.broadcast({ type: 'analyzed', data: this.state })
    } catch (err) {
      this.state.analyzing = false
      this.state.error = err instanceof Error ? err.message : String(err)
      this.options.sse.broadcast({
        type: 'error',
        data: { message: this.state.error },
      })
    } finally {
      this.running = false
    }
  }
}
