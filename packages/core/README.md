# @inngest-tools/core

Static analysis engine for [Inngest](https://www.inngest.com/) step functions. Parses TypeScript source code using [ts-morph](https://ts-morph.com/) to extract function definitions, triggers, steps, event sends, and event waits.

## Installation

```bash
npm install @inngest-tools/core
```

## Usage

```typescript
import { analyzeProject } from '@inngest-tools/core'

const result = analyzeProject('./src', {
  tsConfigPath: './tsconfig.json',
  ignore: ['**/*.test.ts'],
})

console.log(`${result.functions.length} functions found`)
console.log(`${Object.keys(result.eventMap).length} events tracked`)

for (const fn of result.functions) {
  console.log(`${fn.id} (${fn.relativePath}:${fn.line})`)
  console.log(`  triggers: ${fn.triggers.map(t => t.type === 'event' ? t.event : t.cron).join(', ')}`)
  console.log(`  steps: ${fn.steps.map(s => `${s.type}(${s.id})`).join(', ')}`)
  console.log(`  sends: ${fn.sends.map(s => s.eventName).join(', ')}`)
}
```

## API

### `analyzeProject(targetDir, options?): ProjectAnalysis`

Analyzes all Inngest functions in the target directory.

**Options:**
- `tsConfigPath` — Path to tsconfig.json (auto-detected if omitted)
- `ignore` — Glob patterns to exclude
- `include` — Glob patterns to include

### Key Types

```typescript
interface ProjectAnalysis {
  functions: InngestFunction[]
  eventMap: EventMap
  diagnostics: AnalysisDiagnostic[]
  analyzedFiles: number
  analysisTimeMs: number
}

interface InngestFunction {
  id: string
  filePath: string
  triggers: Trigger[]        // event / cron triggers
  steps: Step[]              // step.run / sleep / waitForEvent etc.
  sends: EventSend[]         // inngest.send / step.sendEvent
  waitsFor: EventWait[]      // step.waitForEvent
  config: FunctionConfig     // concurrency / throttle / retries etc.
}
```

## Related Packages

- [`inngest-tools`](https://www.npmjs.com/package/inngest-tools) — CLI
- [`@inngest-tools/viz`](https://www.npmjs.com/package/@inngest-tools/viz) — Visualization
- [`@inngest-tools/lint`](https://www.npmjs.com/package/@inngest-tools/lint) — Linter

## License

MIT
