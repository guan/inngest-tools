import type { VizGraph, VizNode, VizEdge } from '../graph'
import type { RenderOptions } from './common'
import { resolveOptions, filterVisibleNodes, filterVisibleEdges, groupNodesByType, groupNodesByFile, formatNodeLocation } from './common'
import { THEME } from '../theme'

export type DotOptions = RenderOptions

/**
 * VizGraph を Graphviz DOT 形式に変換する
 */
export function renderDot(graph: VizGraph, options?: DotOptions): string {
  const { direction, showOrphans, clusterByFile } = resolveOptions(options)

  const lines: string[] = []
  lines.push('digraph inngest {')
  lines.push(`  rankdir=${direction};`)
  lines.push('  node [fontname="Helvetica" fontsize=12];')
  lines.push('  edge [fontname="Helvetica" fontsize=10];')
  lines.push('')

  const visibleNodes = filterVisibleNodes(graph.nodes, graph.edges, showOrphans)
  const { eventNodes, functionNodes, cronNodes } = groupNodesByType(visibleNodes)

  // Event nodes
  if (eventNodes.length > 0) {
    lines.push('  subgraph cluster_events {')
    lines.push('    label="Events";')
    lines.push('    style=dashed;')
    lines.push('    color=gray;')
    for (const node of eventNodes) {
      lines.push(`    ${node.id} [label=${dotQuote(node.label)} shape=diamond style=filled fillcolor="${THEME.colors.nodeFill.event}"];`)
    }
    lines.push('  }')
    lines.push('')
  }

  // Cron nodes
  if (cronNodes.length > 0) {
    lines.push('  subgraph cluster_cron {')
    lines.push('    label="Cron";')
    lines.push('    style=dashed;')
    lines.push('    color=gray;')
    for (const node of cronNodes) {
      lines.push(`    ${node.id} [label=${dotQuote(node.label)} shape=circle style=filled fillcolor="${THEME.colors.nodeFill.cron}"];`)
    }
    lines.push('  }')
    lines.push('')
  }

  // Function nodes
  if (clusterByFile) {
    const fileGroups = groupNodesByFile(functionNodes)

    let clusterIdx = 0
    for (const [filePath, nodes] of fileGroups) {
      lines.push(`  subgraph cluster_file_${clusterIdx++} {`)
      lines.push(`    label=${dotQuote(filePath)};`)
      lines.push('    style=filled;')
      lines.push('    color="#f5f5f5";')
      for (const node of nodes) {
        lines.push(`    ${node.id} [label=${dotQuote(renderFunctionLabel(node))} shape=box style=filled fillcolor="${THEME.colors.nodeFill.function}"];`)
      }
      lines.push('  }')
      lines.push('')
    }
  } else if (functionNodes.length > 0) {
    lines.push('  subgraph cluster_functions {')
    lines.push('    label="Functions";')
    lines.push('    style=dashed;')
    lines.push('    color=gray;')
    for (const node of functionNodes) {
      lines.push(`    ${node.id} [label=${dotQuote(renderFunctionLabel(node))} shape=box style=filled fillcolor="${THEME.colors.nodeFill.function}"];`)
    }
    lines.push('  }')
    lines.push('')
  }

  // Edges (filter out edges to/from hidden nodes)
  const visibleEdges = filterVisibleEdges(graph.edges, visibleNodes)
  for (const edge of visibleEdges) {
    const attrs = getEdgeAttrs(edge)
    lines.push(`  ${edge.source} -> ${edge.target} [${attrs}];`)
  }

  lines.push('}')
  return lines.join('\n')
}

function renderFunctionLabel(node: VizNode): string {
  const parts = [node.label]
  const location = formatNodeLocation(node)
  if (location) {
    parts.push(location)
  }
  return parts.join('\\n')
}

function getEdgeAttrs(edge: VizEdge): string {
  const parts: string[] = []
  if (edge.label) {
    parts.push(`label=${dotQuote(edge.label)}`)
  }

  switch (edge.type) {
    case 'triggers':
      parts.push(`color="${THEME.colors.edge.triggers}"`)
      break
    case 'sends':
      parts.push(`color="${THEME.colors.edge.sends}"`)
      break
    case 'waitForEvent':
      parts.push(`color="${THEME.colors.edge.waitForEvent}" style=dashed`)
      break
    case 'invoke':
      parts.push(`color="${THEME.colors.edge.invoke}" penwidth=2`)
      break
  }

  return parts.join(' ')
}

function dotQuote(text: string): string {
  return `"${text.replace(/"/g, '\\"')}"`
}
