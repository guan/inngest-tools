# inngest-tools

Static analysis toolset for Inngest step functions. Analyzes TypeScript source code to visualize event dependencies between functions and detect anti-patterns.

## Installation

```bash
npm install -g inngest-tools
# or
pnpm add -g inngest-tools
```

As a library:

```bash
pnpm add @inngest-tools/core @inngest-tools/viz @inngest-tools/lint
```

## Quick Start

```bash
# Output event dependency graph in Mermaid format
inngest-tools viz ./src

# Detect issues with lint
inngest-tools lint ./src
```

## CLI Commands

### `inngest-tools viz <target-dir>`

Visualize event dependencies between Inngest functions.

```bash
inngest-tools viz ./src
inngest-tools viz ./src -f dot -o graph.dot
inngest-tools viz ./src -f html -o graph.html --direction TB --cluster
```

| Option | Description | Default |
|---|---|---|
| `-f, --format <format>` | Output format (`mermaid` \| `json` \| `dot` \| `html`) | `mermaid` |
| `-o, --output <path>` | Output file path (stdout if omitted) | - |
| `--tsconfig <path>` | Path to tsconfig.json | auto-detect |
| `--ignore <patterns...>` | File patterns to ignore | - |
| `--no-orphans` | Hide unconnected nodes | show |
| `--cluster` | Group by file path | `false` |
| `--direction <dir>` | Graph direction (`LR` \| `TB` \| `RL` \| `BT`) | `LR` |

#### Output Formats

- **mermaid** — Mermaid notation. Embed in Markdown for rendering on GitHub, Notion, etc.
- **dot** — Graphviz DOT format. Convert to image with `dot -Tpng graph.dot -o graph.png`
- **json** — VizGraph structure as JSON. For programmatic consumption
- **html** — Interactive HTML with D3.js force-directed graph. Supports filtering, dragging, and zooming

### `inngest-tools lint <target-dir>`

Detect anti-patterns and configuration mistakes in Inngest functions.

```bash
inngest-tools lint ./src
inngest-tools lint ./src --format json -o report.json
inngest-tools lint ./src --rule no-nested-steps:off --max-warnings 5
inngest-tools lint ./src --format sarif -o results.sarif
```

| Option | Description | Default |
|---|---|---|
| `--format <format>` | Output format (`text` \| `json` \| `sarif`) | `text` |
| `-o, --output <path>` | Output file path (stdout if omitted) | - |
| `--tsconfig <path>` | Path to tsconfig.json | auto-detect |
| `--ignore <patterns...>` | File patterns to ignore | - |
| `--rule <rules...>` | Override rule severity (e.g., `no-nested-steps:off`) | - |
| `--max-warnings <n>` | Max warnings before exit code 1 (-1 for unlimited) | `-1` |

#### Exit Codes

| Code | Meaning |
|---|---|
| `0` | No issues found |
| `1` | Errors detected, or warnings exceeded `--max-warnings` |
| `2` | Runtime error (missing directory, invalid config, etc.) |

#### Lint Rules

**Correctness**

| Rule | Default | Description |
|---|---|---|
| `no-nested-steps` | error | Calling `step.*` inside another `step.run()` |
| `unique-step-ids` | error | Duplicate step IDs within the same function |
| `unique-function-ids` | error | Duplicate function IDs across the project |
| `valid-cron` | error | Invalid cron expression |

**Best Practice**

| Rule | Default | Description |
|---|---|---|
| `event-has-listener` | warning | Sent event has no listener |
| `no-orphan-functions` | warning | Event-triggered function has no sender in the project |
| `no-side-effects-outside-steps` | warning | Function with no steps will re-execute all logic on retry |

**Performance**

| Rule | Default | Description |
|---|---|---|
| `sleep-duration-warn` | warning | Sleep duration is too long (default: over 7 days) |
| `concurrency-config` | warning | Invalid concurrency / throttle / rateLimit configuration |

## Configuration

Place `.inngest-tools.json` in your project root to customize default settings. CLI options take precedence.

```json
{
  "targetDir": "./src",
  "tsconfig": "./tsconfig.json",
  "ignore": ["**/*.test.ts", "**/*.spec.ts"],
  "viz": {
    "defaultFormat": "mermaid",
    "direction": "LR",
    "showOrphans": true,
    "clusterByFile": false
  },
  "lint": {
    "rules": {
      "no-nested-steps": "error",
      "sleep-duration-warn": "off"
    },
    "sleepDurationMaxDays": 14,
    "knownExternalEvents": ["webhook/received", "stripe/charge.completed"]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `targetDir` | `string` | Target directory for analysis |
| `tsconfig` | `string` | Path to tsconfig.json |
| `ignore` | `string[]` | Glob patterns to ignore |
| `viz.defaultFormat` | `"mermaid" \| "json" \| "dot" \| "html"` | Default viz output format |
| `viz.direction` | `"LR" \| "TB" \| "RL" \| "BT"` | Graph direction |
| `viz.showOrphans` | `boolean` | Show unconnected nodes |
| `viz.clusterByFile` | `boolean` | Group by file path |
| `lint.rules` | `Record<string, Severity>` | Override rule severities |
| `lint.sleepDurationMaxDays` | `number` | Threshold for sleep-duration-warn (in days) |
| `lint.knownExternalEvents` | `string[]` | Externally sent events (suppresses orphan warnings) |

`Severity`: `"error"` | `"warning"` | `"info"` | `"off"`

## Library Usage

### @inngest-tools/core

Analyzes TypeScript source code and extracts structural information about Inngest functions.

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

#### Key Types

```typescript
interface ProjectAnalysis {
  functions: InngestFunction[]   // Detected functions
  eventMap: EventMap             // Event dependency map
  diagnostics: AnalysisDiagnostic[]
  analyzedFiles: number
  analysisTimeMs: number
}

interface InngestFunction {
  id: string                     // Function ID
  filePath: string               // File path
  triggers: Trigger[]            // event / cron triggers
  steps: Step[]                  // step.run / sleep / waitForEvent etc.
  sends: EventSend[]             // inngest.send / step.sendEvent
  waitsFor: EventWait[]          // step.waitForEvent
  config: FunctionConfig         // concurrency / throttle / retries etc.
}
```

### @inngest-tools/viz

Builds a graph from analysis results and renders it in multiple formats.

```typescript
import { analyzeProject } from '@inngest-tools/core'
import { buildGraph, renderGraph, listFormats } from '@inngest-tools/viz'

const analysis = analyzeProject('./src')
const graph = buildGraph(analysis)

// Via renderer registry
const mermaid = renderGraph('mermaid', graph, { direction: 'TB' })
const html = renderGraph('html', graph, { title: 'My Project' })

// List available formats
console.log(listFormats()) // ['mermaid', 'json', 'dot', 'html']
```

Individual renderers can also be used directly:

```typescript
import { renderMermaid } from '@inngest-tools/viz'
import { renderDot } from '@inngest-tools/viz'
import { renderHtml } from '@inngest-tools/viz'
import { renderJson } from '@inngest-tools/viz'
```

### @inngest-tools/lint

Runs lint rules against analysis results.

```typescript
import { analyzeProject } from '@inngest-tools/core'
import {
  lint,
  builtinRules,
  builtinProjectRules,
  formatText,
  formatJson,
  formatSarif,
} from '@inngest-tools/lint'

const analysis = analyzeProject('./src')

const result = lint(analysis, builtinRules, builtinProjectRules, {
  rules: {
    'no-nested-steps': 'error',
    'sleep-duration-warn': 'off',
  },
})

// Text output (ESLint-style)
console.log(formatText(result))

// JSON output
console.log(formatJson(result, { pretty: true }))

// SARIF output (GitHub Code Scanning integration)
fs.writeFileSync('results.sarif', formatSarif(result))
```

Creating custom rules:

```typescript
import type { LintRule } from '@inngest-tools/lint'

const myRule: LintRule = {
  id: 'my-custom-rule',
  description: 'My custom lint rule',
  defaultSeverity: 'warning',
  category: 'best-practice',
  check(fn, analysis) {
    const diagnostics = []
    if (fn.steps.length > 10) {
      diagnostics.push({
        ruleId: 'my-custom-rule',
        severity: 'warning',
        message: `Function "${fn.id}" has ${fn.steps.length} steps. Consider splitting.`,
        filePath: fn.filePath,
        line: fn.line,
      })
    }
    return diagnostics
  },
}

const result = lint(analysis, [...builtinRules, myRule], builtinProjectRules)
```

## Package Structure

```
packages/
  core/     @inngest-tools/core   — TypeScript AST analysis (ts-morph)
  viz/      @inngest-tools/viz    — Graph building & rendering
  lint/     @inngest-tools/lint   — Lint engine, rules & reporters
  cli/      inngest-tools         — CLI entry point
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check
pnpm typecheck

# Clean
pnpm clean
```

## License

MIT
