# @inngest-tools/lint

Linter for [Inngest](https://www.inngest.com/) step functions. Detects anti-patterns, configuration mistakes, and best practice violations.

## Installation

```bash
npm install @inngest-tools/lint @inngest-tools/core
```

## Usage

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

// ESLint-style text output
console.log(formatText(result))

// JSON output
console.log(formatJson(result, { pretty: true }))

// SARIF output (GitHub Code Scanning)
fs.writeFileSync('results.sarif', formatSarif(result))
```

## Built-in Rules

**Correctness**

| Rule | Default | Description |
|---|---|---|
| `no-nested-steps` | error | `step.*` called inside another `step.run()` |
| `unique-step-ids` | error | Duplicate step IDs within the same function |
| `unique-function-ids` | error | Duplicate function IDs across the project |
| `valid-cron` | error | Invalid cron expression |

**Best Practice**

| Rule | Default | Description |
|---|---|---|
| `event-has-listener` | warning | Sent event has no listener |
| `no-orphan-functions` | warning | Event-triggered function has no sender |
| `no-side-effects-outside-steps` | warning | Function with no steps re-executes all logic on retry |

**Performance**

| Rule | Default | Description |
|---|---|---|
| `sleep-duration-warn` | warning | Sleep duration exceeds threshold (default: 7 days) |
| `concurrency-config` | warning | Invalid concurrency / throttle / rateLimit config |

## Custom Rules

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

## Related Packages

- [`inngest-tools`](https://www.npmjs.com/package/inngest-tools) — CLI
- [`@inngest-tools/core`](https://www.npmjs.com/package/@inngest-tools/core) — Analysis engine
- [`@inngest-tools/viz`](https://www.npmjs.com/package/@inngest-tools/viz) — Visualization

## License

MIT
