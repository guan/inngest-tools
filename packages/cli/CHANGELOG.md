# inngest-tools

## 0.2.0

### Minor Changes

- 6297b92: Add live dev dashboard (`inngest-tools dev`) with real-time file watching, interactive dependency graph, function list, and lint results. Improve parser to resolve createFunction calls across files.

### Patch Changes

- Updated dependencies [6297b92]
  - @inngest-tools/dev-server@0.2.0
  - @inngest-tools/core@0.2.0
  - @inngest-tools/lint@0.1.2
  - @inngest-tools/viz@0.1.2

## 0.1.1

### Patch Changes

- Add README to each package for npm
- Updated dependencies
  - @inngest-tools/core@0.1.1
  - @inngest-tools/lint@0.1.1
  - @inngest-tools/viz@0.1.1

## 0.1.0

### Minor Changes

- Initial release of inngest-tools.

  - @inngest-tools/core: TypeScript AST analysis for Inngest step functions
  - @inngest-tools/viz: Graph building and rendering (mermaid, dot, json, html)
  - @inngest-tools/lint: Lint engine with 9 built-in rules and reporters (text, json, sarif)
  - inngest-tools: CLI with viz and lint commands

### Patch Changes

- Updated dependencies
  - @inngest-tools/core@0.1.0
  - @inngest-tools/viz@0.1.0
  - @inngest-tools/lint@0.1.0
