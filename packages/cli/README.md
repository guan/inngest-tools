# inngest-tools

Static analysis CLI for [Inngest](https://www.inngest.com/) step functions. Analyzes TypeScript source code to visualize event dependencies and detect anti-patterns.

## Installation

```bash
npm install -g inngest-tools
# or
pnpm add -g inngest-tools
```

## Commands

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

### `inngest-tools lint <target-dir>`

Detect anti-patterns and configuration mistakes.

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

#### Lint Rules

**Correctness**: `no-nested-steps` (error), `unique-step-ids` (error), `unique-function-ids` (error), `valid-cron` (error)

**Best Practice**: `event-has-listener` (warning), `no-orphan-functions` (warning), `no-side-effects-outside-steps` (warning)

**Performance**: `sleep-duration-warn` (warning), `concurrency-config` (warning)

## Configuration

Place `.inngest-tools.json` in your project root:

```json
{
  "targetDir": "./src",
  "viz": {
    "defaultFormat": "mermaid",
    "direction": "LR"
  },
  "lint": {
    "rules": {
      "no-nested-steps": "error",
      "sleep-duration-warn": "off"
    }
  }
}
```

## Related Packages

- [`@inngest-tools/core`](https://www.npmjs.com/package/@inngest-tools/core) — Analysis engine
- [`@inngest-tools/viz`](https://www.npmjs.com/package/@inngest-tools/viz) — Graph building & rendering
- [`@inngest-tools/lint`](https://www.npmjs.com/package/@inngest-tools/lint) — Lint engine & rules

## License

MIT
