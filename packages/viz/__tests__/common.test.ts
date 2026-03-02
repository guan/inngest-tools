import { describe, it, expect } from 'vitest'
import {
  resolveOptions,
  getConnectedNodeIds,
  filterVisibleNodes,
  filterVisibleEdges,
  groupNodesByType,
  groupNodesByFile,
  formatNodeLocation,
} from '../src/renderers/common'
import type { VizNode, VizEdge } from '../src/graph'

const nodes: VizNode[] = [
  { id: 'E_ev1', type: 'event', label: 'ev1', metadata: {} },
  { id: 'F_fn1', type: 'function', label: 'fn1', metadata: { filePath: 'src/a.ts', line: 5 } },
  { id: 'F_fn2', type: 'function', label: 'fn2', metadata: { filePath: 'src/b.ts', line: 10 } },
  { id: 'C_cron', type: 'cron', label: '0 * * * *', metadata: { cronSchedule: '0 * * * *' } },
  { id: 'F_orphan', type: 'function', label: 'orphan', metadata: { filePath: 'src/a.ts' } },
]

const edges: VizEdge[] = [
  { source: 'E_ev1', target: 'F_fn1', type: 'triggers', label: 'triggers' },
  { source: 'C_cron', target: 'F_fn2', type: 'triggers', label: 'cron' },
]

describe('resolveOptions', () => {
  it('returns defaults when no options provided', () => {
    const opts = resolveOptions()
    expect(opts).toEqual({ direction: 'LR', showOrphans: true, clusterByFile: false })
  })

  it('respects provided values', () => {
    const opts = resolveOptions({ direction: 'TB', showOrphans: false, clusterByFile: true })
    expect(opts).toEqual({ direction: 'TB', showOrphans: false, clusterByFile: true })
  })

  it('fills in missing values with defaults', () => {
    const opts = resolveOptions({ direction: 'RL' })
    expect(opts.direction).toBe('RL')
    expect(opts.showOrphans).toBe(true)
    expect(opts.clusterByFile).toBe(false)
  })
})

describe('getConnectedNodeIds', () => {
  it('returns all source and target IDs', () => {
    const ids = getConnectedNodeIds(edges)
    expect(ids.has('E_ev1')).toBe(true)
    expect(ids.has('F_fn1')).toBe(true)
    expect(ids.has('C_cron')).toBe(true)
    expect(ids.has('F_fn2')).toBe(true)
    expect(ids.has('F_orphan')).toBe(false)
  })

  it('returns empty set for no edges', () => {
    expect(getConnectedNodeIds([]).size).toBe(0)
  })
})

describe('filterVisibleNodes', () => {
  it('returns all nodes when showOrphans is true', () => {
    const visible = filterVisibleNodes(nodes, edges, true)
    expect(visible).toHaveLength(5)
  })

  it('filters orphan nodes when showOrphans is false', () => {
    const visible = filterVisibleNodes(nodes, edges, false)
    expect(visible).toHaveLength(4)
    expect(visible.find(n => n.id === 'F_orphan')).toBeUndefined()
  })
})

describe('filterVisibleEdges', () => {
  it('returns all edges when all nodes are visible', () => {
    const filtered = filterVisibleEdges(edges, nodes)
    expect(filtered).toHaveLength(2)
  })

  it('filters edges when nodes are hidden', () => {
    const visibleNodes = nodes.filter(n => n.id !== 'F_fn1')
    const filtered = filterVisibleEdges(edges, visibleNodes)
    // The edge E_ev1 -> F_fn1 should be removed since F_fn1 is hidden
    expect(filtered).toHaveLength(1)
    expect(filtered[0].source).toBe('C_cron')
  })

  it('returns empty when no nodes are visible', () => {
    const filtered = filterVisibleEdges(edges, [])
    expect(filtered).toHaveLength(0)
  })
})

describe('groupNodesByType', () => {
  it('groups nodes correctly', () => {
    const groups = groupNodesByType(nodes)
    expect(groups.eventNodes).toHaveLength(1)
    expect(groups.functionNodes).toHaveLength(3)
    expect(groups.cronNodes).toHaveLength(1)
  })
})

describe('groupNodesByFile', () => {
  it('groups by filePath metadata', () => {
    const fnNodes = nodes.filter(n => n.type === 'function')
    const groups = groupNodesByFile(fnNodes)
    expect(groups.get('src/a.ts')).toHaveLength(2)
    expect(groups.get('src/b.ts')).toHaveLength(1)
  })

  it('groups nodes without filePath under "unknown"', () => {
    const noFileNodes: VizNode[] = [
      { id: 'F_x', type: 'function', label: 'x', metadata: {} },
    ]
    const groups = groupNodesByFile(noFileNodes)
    expect(groups.get('unknown')).toHaveLength(1)
  })
})

describe('formatNodeLocation', () => {
  it('formats filePath:line', () => {
    expect(formatNodeLocation(nodes[1])).toBe('src/a.ts:5')
  })

  it('formats filePath only when no line', () => {
    expect(formatNodeLocation(nodes[4])).toBe('src/a.ts')
  })

  it('returns null when no filePath', () => {
    expect(formatNodeLocation(nodes[0])).toBeNull()
  })
})
