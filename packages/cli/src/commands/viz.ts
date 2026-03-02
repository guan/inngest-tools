import { Command } from 'commander'
import { analyzeProject } from '@inngest-tools/core'
import { buildGraph, renderGraph, listFormats } from '@inngest-tools/viz'
import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk'
import { loadConfig, mergeConfig } from '../config'

export function registerVizCommand(program: Command): void {
  const formats = listFormats().join('|')
  program
    .command('viz <target-dir>')
    .description('Visualize event dependencies between Inngest functions')
    .option('-f, --format <format>', `Output format (${formats})`, 'mermaid')
    .option('-o, --output <path>', 'Output file path (stdout if omitted)')
    .option('--tsconfig <path>', 'Path to tsconfig.json')
    .option('--ignore <patterns...>', 'File patterns to ignore')
    .option('--no-orphans', 'Hide orphan nodes')
    .option('--cluster', 'Cluster by file path')
    .option('--direction <dir>', 'Graph direction (LR|TB|RL|BT)', 'LR')
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
          format: fileConfig.viz?.defaultFormat,
          direction: fileConfig.viz?.direction,
          orphans: fileConfig.viz?.showOrphans,
          cluster: fileConfig.viz?.clusterByFile,
          tsconfig: fileConfig.tsconfig,
          ignore: fileConfig.ignore,
        })

        const analysis = analyzeProject(resolvedDir, {
          tsConfigPath: mergedOptions.tsconfig,
          ignore: mergedOptions.ignore,
        })

        if (analysis.functions.length === 0) {
          console.error(chalk.yellow('Warning: No Inngest functions found'))
          process.exit(0)
        }

        const graph = buildGraph(analysis)
        const renderOptions = {
          direction: mergedOptions.direction as 'LR' | 'TB' | 'RL' | 'BT',
          showOrphans: mergedOptions.orphans !== false,
          clusterByFile: mergedOptions.cluster,
          title: 'Inngest Function Graph',
        }

        let output: string
        try {
          output = renderGraph(mergedOptions.format, graph, renderOptions)
        } catch (e) {
          console.error(chalk.red(`Error: ${e instanceof Error ? e.message : e}`))
          process.exit(2)
        }

        if (mergedOptions.output) {
          const outputPath = path.resolve(mergedOptions.output)
          fs.writeFileSync(outputPath, output, 'utf-8')
          console.error(
            chalk.green(
              `✓ Written to ${mergedOptions.output} (${analysis.functions.length} functions, ${Object.keys(analysis.eventMap).length} events)`
            )
          )
        } else {
          console.log(output)
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error instanceof Error ? error.message : error}`))
        process.exit(2)
      }
    })
}
