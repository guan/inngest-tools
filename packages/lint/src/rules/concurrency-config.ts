import type { LintRule, LintDiagnostic } from '../types'
import type { InngestFunction, ProjectAnalysis } from '@inngest-tools/core'

function checkPositive(
  value: number | undefined,
  fn: InngestFunction,
  fieldName: string
): LintDiagnostic | null {
  if (value !== undefined && value <= 0) {
    return {
      ruleId: 'concurrency-config',
      severity: 'warning',
      message: `Function "${fn.id}" has ${fieldName} ${value} which is invalid. Must be a positive integer.`,
      filePath: fn.filePath,
      line: fn.line,
    }
  }
  return null
}

function checkNonNegative(
  value: number | undefined,
  fn: InngestFunction,
  fieldName: string
): LintDiagnostic | null {
  if (value !== undefined && value < 0) {
    return {
      ruleId: 'concurrency-config',
      severity: 'warning',
      message: `Function "${fn.id}" has ${fieldName} ${value} which is invalid. Must be 0 or a positive integer.`,
      filePath: fn.filePath,
      line: fn.line,
    }
  }
  return null
}

export const concurrencyConfig: LintRule = {
  id: 'concurrency-config',
  description: 'Validate concurrency, throttle, and rate limit configuration',
  defaultSeverity: 'warning',
  category: 'correctness',

  check(fn: InngestFunction, _analysis: ProjectAnalysis): LintDiagnostic[] {
    const { config } = fn
    const results = [
      checkPositive(config.concurrency?.limit, fn, 'concurrency limit'),
      checkPositive(config.throttle?.limit, fn, 'throttle limit'),
      checkPositive(config.rateLimit?.limit, fn, 'rateLimit limit'),
      checkNonNegative(config.retries, fn, 'retries'),
      checkPositive(config.batchEvents?.maxSize, fn, 'batchEvents.maxSize'),
    ]
    return results.filter((d): d is LintDiagnostic => d !== null)
  },
}
