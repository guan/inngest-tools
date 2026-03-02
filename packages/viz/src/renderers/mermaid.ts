import type { VizGraph, VizNode, VizEdge } from '../graph'
import type { RenderOptions } from './common'
import { resolveOptions, filterVisibleNodes, filterVisibleEdges, groupNodesByType, groupNodesByFile, formatNodeLocation } from './common'

export type MermaidOptions = RenderOptions

/**
 * VizGraph を Mermaid 記法に変換する
 */
export function renderMermaid(graph: VizGraph, options?: MermaidOptions): string {
  const { direction, showOrphans, clusterByFile } = resolveOptions(options)

  const lines: string[] = []
  lines.push(`graph ${direction}`)

  const visibleNodes = filterVisibleNodes(graph.nodes, graph.edges, showOrphans)
  const { eventNodes, functionNodes, cronNodes } = groupNodesByType(visibleNodes)

  // Event nodes subgraph
  if (eventNodes.length > 0) {
    lines.push('  subgraph Events')
    for (const node of eventNodes) {
      lines.push(`    ${node.id}["${escapeLabel(node.label)}"]`)
    }
    lines.push('  end')
    lines.push('')
  }

  // Cron nodes subgraph
  if (cronNodes.length > 0) {
    lines.push('  subgraph Cron')
    for (const node of cronNodes) {
      lines.push(`    ${node.id}[("${escapeLabel(node.label)}")]`)
    }
    lines.push('  end')
    lines.push('')
  }

  // Function nodes
  if (clusterByFile) {
    const fileGroups = groupNodesByFile(functionNodes)

    for (const [filePath, nodes] of fileGroups) {
      const subgraphId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
      lines.push(`  subgraph ${subgraphId}["${escapeLabel(filePath)}"]`)
      for (const node of nodes) {
        lines.push(`    ${node.id}["${renderFunctionLabel(node)}"]`)
      }
      lines.push('  end')
      lines.push('')
    }
  } else if (functionNodes.length > 0) {
    lines.push('  subgraph Functions')
    for (const node of functionNodes) {
      lines.push(`    ${node.id}["${renderFunctionLabel(node)}"]`)
    }
    lines.push('  end')
    lines.push('')
  }

  // Edges (filter out edges to/from hidden nodes)
  const visibleEdges = filterVisibleEdges(graph.edges, visibleNodes)
  for (const edge of visibleEdges) {
    lines.push(`  ${renderEdge(edge)}`)
  }

  return lines.join('\n')
}

function renderFunctionLabel(node: VizNode): string {
  const parts = [escapeLabel(node.label)]
  const location = formatNodeLocation(node)
  if (location) {
    parts.push(`<br/><small>${escapeLabel(location)}</small>`)
  }
  return parts.join('')
}

function renderEdge(edge: VizEdge): string {
  const label = edge.label ? `|${edge.label}|` : ''

  switch (edge.type) {
    case 'triggers':
      return `${edge.source} -->${label} ${edge.target}`
    case 'sends':
      return `${edge.source} -->${label} ${edge.target}`
    case 'waitForEvent':
      return `${edge.source} -.->${label} ${edge.target}`
    case 'invoke':
      return `${edge.source} ==>${label} ${edge.target}`
    default:
      return `${edge.source} -->${label} ${edge.target}`
  }
}

function escapeLabel(text: string): string {
  return text.replace(/"/g, '&quot;')
}
