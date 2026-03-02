import type { LintResult } from '../types'

export interface JsonReporterOptions {
  pretty?: boolean
}

/**
 * LintResult を JSON 文字列に変換する
 */
export function formatJson(result: LintResult, options?: JsonReporterOptions): string {
  const pretty = options?.pretty ?? true
  return pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result)
}
