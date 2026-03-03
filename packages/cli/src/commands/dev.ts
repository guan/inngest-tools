import { Command } from 'commander'
import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk'
import { loadConfig, mergeConfig } from '../config'
import { startDevServer } from '@inngest-tools/dev-server'

export function registerDevCommand(program: Command): void {
  program
    .command('dev <target-dir>')
    .description(
      'Start a live dev dashboard for monitoring Inngest functions'
    )
    .option('-p, --port <port>', 'Port to listen on', '6600')
    .option('--host <host>', 'Hostname to bind to', '0.0.0.0')
    .option('--tsconfig <path>', 'Path to tsconfig.json')
    .option('--ignore <patterns...>', 'File patterns to ignore')
    .option('--no-open', 'Do not open browser automatically')
    .action(async (targetDir: string, options) => {
      try {
        const resolvedDir = path.resolve(targetDir)

        if (!fs.existsSync(resolvedDir)) {
          console.error(
            chalk.red(`Error: Directory "${targetDir}" does not exist`)
          )
          process.exit(2)
        }

        const fileConfig = loadConfig(resolvedDir)
        const mergedOptions = mergeConfig(options, {
          tsconfig: fileConfig.tsconfig,
          ignore: fileConfig.ignore,
        })

        const port = parseInt(mergedOptions.port as string, 10)

        const handle = await startDevServer({
          targetDir: resolvedDir,
          port,
          host: mergedOptions.host as string,
          tsConfigPath: mergedOptions.tsconfig as string | undefined,
          ignore: mergedOptions.ignore as string[] | undefined,
          lintConfig: fileConfig.lint?.rules
            ? { rules: fileConfig.lint.rules }
            : undefined,
        })

        const displayUrl =
          (mergedOptions.host as string) === '0.0.0.0'
            ? `http://localhost:${port}`
            : handle.url

        console.log(chalk.green(`\n  Inngest Tools Dev Dashboard`))
        console.log(chalk.gray(`  Watching: ${resolvedDir}`))
        console.log(chalk.cyan(`  Local:    ${displayUrl}`))
        if ((mergedOptions.host as string) === '0.0.0.0') {
          console.log(chalk.cyan(`  Network:  http://0.0.0.0:${port}`))
        }
        console.log()

        // Open browser if requested
        if (mergedOptions.open !== false) {
          const { exec } = await import('node:child_process')
          const openCmd =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'start'
                : 'xdg-open'
          exec(`${openCmd} ${displayUrl}`)
        }

        // Graceful shutdown
        const shutdown = async () => {
          console.log(chalk.gray('\n  Shutting down...'))
          await handle.close()
          process.exit(0)
        }
        process.on('SIGINT', shutdown)
        process.on('SIGTERM', shutdown)
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : error}`)
        )
        process.exit(2)
      }
    })
}
