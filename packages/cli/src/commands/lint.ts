import { Command } from 'commander'
import { analyzeProject } from '@inngest-tools/core'
import {
  lint,
  builtinRules,
  builtinProjectRules,
  formatText,
  formatJson,
  formatSarif,
  type Severity,
  type LintConfig,
} from '@inngest-tools/lint'
import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk'
import { loadConfig, mergeConfig } from '../config'

export function registerLintCommand(program: Command): void {
  program
    .command('lint <target-dir>')
    .description('Lint Inngest functions for common mistakes and anti-patterns')
    .option('--format <format>', 'Output format (text|json|sarif)', 'text')
    .option('-o, --output <path>', 'Output file path (stdout if omitted)')
    .option('--tsconfig <path>', 'Path to tsconfig.json')
    .option('--ignore <patterns...>', 'File patterns to ignore')
    .option('--rule <rules...>', 'Override rule severity (e.g., --rule no-nested-steps:off)')
    .option('--max-warnings <n>', 'Max warnings before exit code 1 (-1 for unlimited)', '-1')
    .action((targetDir: string, options) => {
      try {
        const resolvedDir = path.resolve(targetDir)

        if (!fs.existsSync(resolvedDir)) {
          console.error(chalk.red(`Error: Directory "${targetDir}" does not exist`))
          process.exit(2)
        }

        // Load config file and merge with CLI options
        const fileConfig = loadConfig(resolvedDir)
        const mergedOptions = mergeConfig(options, {
          tsconfig: fileConfig.tsconfig,
          ignore: fileConfig.ignore,
        })

        const analysis = analyzeProject(resolvedDir, {
          tsConfigPath: mergedOptions.tsconfig,
          ignore: mergedOptions.ignore,
        })

        // Parse rule overrides: config file first, then CLI flags override
        const config: LintConfig = { rules: {} }

        const validSeverities: Set<string> = new Set(['error', 'warning', 'info', 'off'])

        // Apply rules from config file (already validated by zod)
        if (fileConfig.lint?.rules) {
          for (const [ruleId, severity] of Object.entries(fileConfig.lint.rules)) {
            config.rules![ruleId] = severity as Severity
          }
        }

        // Apply rules from CLI (overrides config file)
        if (mergedOptions.rule) {
          for (const ruleStr of mergedOptions.rule as string[]) {
            const [ruleId, severity] = ruleStr.split(':')
            if (ruleId && severity) {
              if (!validSeverities.has(severity)) {
                console.error(chalk.red(`Error: Invalid severity "${severity}" for rule "${ruleId}". Must be one of: error, warning, info, off`))
                process.exit(2)
              }
              config.rules![ruleId] = severity as Severity
            }
          }
        }

        const result = lint(analysis, builtinRules, builtinProjectRules, config)

        let output: string
        switch (mergedOptions.format) {
          case 'json':
            output = formatJson(result)
            break
          case 'sarif':
            output = formatSarif(result)
            break
          case 'text':
          default:
            output = formatText(result, { colors: !mergedOptions.output })
            break
        }

        if (mergedOptions.output) {
          const outputPath = path.resolve(mergedOptions.output)
          fs.writeFileSync(outputPath, output, 'utf-8')
          console.error(chalk.green(`✓ Written to ${mergedOptions.output}`))
        } else if (output.trim()) {
          console.log(output)
        }

        // Exit codes
        const maxWarnings = parseInt(mergedOptions.maxWarnings, 10)
        if (result.summary.errors > 0) {
          process.exit(1)
        }
        if (maxWarnings >= 0 && result.summary.warnings > maxWarnings) {
          console.error(
            chalk.red(
              `\nToo many warnings (${result.summary.warnings}). Max allowed: ${maxWarnings}`
            )
          )
          process.exit(1)
        }

        if (result.diagnostics.length === 0) {
          console.error(chalk.green(`✓ No issues found (${analysis.functions.length} functions analyzed)`))
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`))
        process.exit(2)
      }
    })
}
