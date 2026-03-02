# @inngest-tools/viz

Visualization renderers for [Inngest](https://www.inngest.com/) function graphs. Builds a dependency graph from analysis results and renders it in multiple formats.

## Installation

```bash
npm install @inngest-tools/viz @inngest-tools/core
```

## Usage

```typescript
import { analyzeProject } from '@inngest-tools/core'
import { buildGraph, renderGraph, listFormats } from '@inngest-tools/viz'

const analysis = analyzeProject('./src')
const graph = buildGraph(analysis)

// Render via registry
const mermaid = renderGraph('mermaid', graph, { direction: 'TB' })
const html = renderGraph('html', graph, { title: 'My Project' })

// List available formats
console.log(listFormats()) // ['mermaid', 'json', 'dot', 'html']
```

### Direct renderer imports

```typescript
import { renderMermaid } from '@inngest-tools/viz'
import { renderDot } from '@inngest-tools/viz'
import { renderHtml } from '@inngest-tools/viz'
import { renderJson } from '@inngest-tools/viz'
```

## Output Formats

| Format | Description |
|---|---|
| `mermaid` | Mermaid notation for Markdown rendering (GitHub, Notion, etc.) |
| `dot` | Graphviz DOT format — convert with `dot -Tpng graph.dot -o graph.png` |
| `json` | VizGraph as JSON for programmatic use |
| `html` | Interactive D3.js force-directed graph with filtering, dragging, zoom |

## Options

```typescript
buildGraph(analysis, {
  showOrphans: true,      // Include unconnected nodes
  clusterByFile: false,   // Group nodes by file path
})

renderGraph('mermaid', graph, {
  direction: 'LR',       // LR | TB | RL | BT
})
```

## Related Packages

- [`inngest-tools`](https://www.npmjs.com/package/inngest-tools) — CLI
- [`@inngest-tools/core`](https://www.npmjs.com/package/@inngest-tools/core) — Analysis engine
- [`@inngest-tools/lint`](https://www.npmjs.com/package/@inngest-tools/lint) — Linter

## License

MIT
