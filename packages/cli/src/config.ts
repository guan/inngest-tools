import * as fs from 'node:fs'
import * as path from 'node:path'
import { z } from 'zod'

const SeveritySchema = z.enum(['error', 'warning', 'info', 'off'])

const ToolsConfigSchema = z.object({
  targetDir: z.string().optional(),
  tsconfig: z.string().optional(),
  ignore: z.array(z.string()).optional(),
  viz: z
    .object({
      defaultFormat: z.enum(['mermaid', 'json', 'dot', 'html']).optional(),
      direction: z.enum(['LR', 'TB', 'RL', 'BT']).optional(),
      showOrphans: z.boolean().optional(),
      clusterByFile: z.boolean().optional(),
    })
    .optional(),
  lint: z
    .object({
      rules: z.record(z.string(), SeveritySchema).optional(),
      sleepDurationMaxDays: z.number().int().positive().optional(),
      knownExternalEvents: z.array(z.string()).optional(),
    })
    .optional(),
})

export type ToolsConfig = z.infer<typeof ToolsConfigSchema>

const CONFIG_FILENAMES = ['.inngest-tools.json', 'inngest-tools.config.json']

/**
 * 設定ファイルを探して読み込む。見つからない場合は空のオブジェクトを返す。
 */
export function loadConfig(baseDir?: string): ToolsConfig {
  const dir = baseDir ? path.resolve(baseDir) : process.cwd()

  for (const filename of CONFIG_FILENAMES) {
    const filePath = path.join(dir, filename)
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(content)
        const result = ToolsConfigSchema.safeParse(parsed)
        if (!result.success) {
          const issues = result.error.issues.map(
            (i) => `  - ${i.path.join('.')}: ${i.message}`
          )
          throw new Error(
            `Invalid config in ${filePath}:\n${issues.join('\n')}`
          )
        }
        return result.data
      } catch (e) {
        if (e instanceof SyntaxError) {
          throw new Error(
            `Failed to parse config file ${filePath}: ${e.message}`
          )
        }
        throw e
      }
    }
  }

  return {}
}

/**
 * CLI オプションと設定ファイルをマージする。CLI オプションが優先。
 */
export function mergeConfig<T extends Record<string, unknown>>(
  cliOptions: T,
  fileConfig: Record<string, unknown>
): T {
  const merged = { ...fileConfig } as T
  for (const [key, value] of Object.entries(cliOptions)) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value
    }
  }
  return merged
}
