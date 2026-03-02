import type { VizNode, VizEdge } from '../graph'

export interface RenderOptions {
  direction?: 'LR' | 'TB' | 'RL' | 'BT'
  showOrphans?: boolean
  clusterByFile?: boolean
}

export function resolveOptions(options?: RenderOptions): Required<RenderOptions> {
  return {
    direction: options?.direction ?? 'LR',
    showOrphans: options?.showOrphans ?? true,
    clusterByFile: options?.clusterByFile ?? false,
  }
}

export function getConnectedNodeIds(edges: VizEdge[]): Set<string> {
  const ids = new Set<string>()
  for (const edge of edges) {
    ids.add(edge.source)
    ids.add(edge.target)
  }
  return ids
}

export function filterVisibleNodes(nodes: VizNode[], edges: VizEdge[], showOrphans: boolean): VizNode[] {
  if (showOrphans) return nodes
  const connected = getConnectedNodeIds(edges)
  return nodes.filter(n => connected.has(n.id))
}

export function groupNodesByType(nodes: VizNode[]) {
  return {
    eventNodes: nodes.filter(n => n.type === 'event'),
    functionNodes: nodes.filter(n => n.type === 'function'),
    cronNodes: nodes.filter(n => n.type === 'cron'),
  }
}

export function groupNodesByFile(nodes: VizNode[]): Map<string, VizNode[]> {
  const groups = new Map<string, VizNode[]>()
  for (const node of nodes) {
    const filePath = node.metadata.filePath ?? 'unknown'
    if (!groups.has(filePath)) {
      groups.set(filePath, [])
    }
    groups.get(filePath)!.push(node)
  }
  return groups
}

export function filterVisibleEdges(edges: VizEdge[], visibleNodes: VizNode[]): VizEdge[] {
  const visibleIds = new Set(visibleNodes.map(n => n.id))
  return edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
}

export function formatNodeLocation(node: VizNode): string | null {
  if (!node.metadata.filePath) return null
  return node.metadata.line
    ? `${node.metadata.filePath}:${node.metadata.line}`
    : node.metadata.filePath
}
