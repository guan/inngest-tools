import { Command } from 'commander'
import { registerVizCommand } from './commands/viz'
import { registerLintCommand } from './commands/lint'
import { registerDevCommand } from './commands/dev'

const program = new Command()
  .name('inngest-tools')
  .description('Static analysis tools for Inngest step functions')
  .version('0.0.0')

registerVizCommand(program)
registerLintCommand(program)
registerDevCommand(program)

program.parse()
