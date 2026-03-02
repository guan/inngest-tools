import type { ProjectAnalysis } from '@inngest-tools/core'
import { sanitizeId } from '@inngest-tools/core'

export interface VizGraph {
  nodes: VizNode[]
  edges: VizEdge[]
}

export interface VizNode {
  id: string
  type: 'function' | 'event' | 'cron'
  label: string
  metadata: {
    filePath?: string
    line?: number
    stepsCount?: number
    cronSchedule?: string
  }
}

export interface VizEdge {
  source: string
  target: string
  type: 'triggers' | 'sends' | 'waitForEvent' | 'invoke'
  label?: string
}

/**
 * ProjectAnalysis から VizGraph を生成する
 */
export function buildGraph(analysis: ProjectAnalysis): VizGraph {
  const nodes: VizNode[] = []
  const edges: VizEdge[] = []
  const eventNodeIds = new Set<string>()
  const cronNodeIds = new Set<string>()

  // Create function nodes
  for (const fn of analysis.functions) {
    const nodeId = `F_${sanitizeId(fn.id)}`
    nodes.push({
      id: nodeId,
      type: 'function',
      label: fn.id,
      metadata: {
        filePath: fn.relativePath,
        line: fn.line,
        stepsCount: fn.steps.length,
      },
    })

    // Process triggers
    for (const trigger of fn.triggers) {
      if (trigger.type === 'event' && trigger.event && !trigger.isDynamic) {
        const eventNodeId = `E_${sanitizeId(trigger.event)}`
        if (!eventNodeIds.has(eventNodeId)) {
          eventNodeIds.add(eventNodeId)
          nodes.push({
            id: eventNodeId,
            type: 'event',
            label: trigger.event,
            metadata: {},
          })
        }
        edges.push({
          source: eventNodeId,
          target: nodeId,
          type: 'triggers',
          label: 'triggers',
        })
      }

      if (trigger.type === 'cron') {
        const cronNodeId = `C_${sanitizeId(trigger.cron)}`
        if (!cronNodeIds.has(cronNodeId)) {
          cronNodeIds.add(cronNodeId)
          nodes.push({
            id: cronNodeId,
            type: 'cron',
            label: trigger.cron,
            metadata: { cronSchedule: trigger.cron },
          })
        }
        edges.push({
          source: cronNodeId,
          target: nodeId,
          type: 'triggers',
          label: 'cron',
        })
      }
    }

    // Process event sends
    for (const send of fn.sends) {
      if (send.eventName && !send.isDynamic) {
        const eventNodeId = `E_${sanitizeId(send.eventName)}`
        if (!eventNodeIds.has(eventNodeId)) {
          eventNodeIds.add(eventNodeId)
          nodes.push({
            id: eventNodeId,
            type: 'event',
            label: send.eventName,
            metadata: {},
          })
        }
        edges.push({
          source: nodeId,
          target: eventNodeId,
          type: 'sends',
          label: 'sends',
        })
      }
    }

    // Process waitForEvent
    for (const wait of fn.waitsFor) {
      if (wait.eventName && !wait.isDynamic) {
        const eventNodeId = `E_${sanitizeId(wait.eventName)}`
        if (!eventNodeIds.has(eventNodeId)) {
          eventNodeIds.add(eventNodeId)
          nodes.push({
            id: eventNodeId,
            type: 'event',
            label: wait.eventName,
            metadata: {},
          })
        }
        edges.push({
          source: nodeId,
          target: eventNodeId,
          type: 'waitForEvent',
          label: 'waitForEvent',
        })
      }
    }

    // Process invoke
    for (const step of fn.steps) {
      if (step.type === 'invoke' && step.invokeTarget) {
        const targetNodeId = `F_${sanitizeId(step.invokeTarget)}`
        edges.push({
          source: nodeId,
          target: targetNodeId,
          type: 'invoke',
          label: 'invoke',
        })
      }
    }
  }

  return { nodes, edges }
}
