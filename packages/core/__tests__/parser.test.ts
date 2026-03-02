import { describe, it, expect } from 'vitest'
import * as path from 'node:path'
import { analyzeProject, findInngestInstances, buildEventMap } from '../src/parser'
import { createProject } from '../src/resolver'
import { Project } from 'ts-morph'

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

describe('findInngestInstances', () => {
  it('detects new Inngest() with variable assignment', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    project.createSourceFile(
      'test.ts',
      `
      import { Inngest } from 'inngest'
      const inngest = new Inngest({ id: 'test' })
    `
    )
    const instances = findInngestInstances(project)
    expect(instances).toHaveLength(1)
    expect(instances[0].variableName).toBe('inngest')
  })

  it('detects multiple instances', () => {
    const project = new Project({ useInMemoryFileSystem: true })
    project.createSourceFile(
      'test.ts',
      `
      import { Inngest } from 'inngest'
      const inngest1 = new Inngest({ id: 'app1' })
      const inngest2 = new Inngest({ id: 'app2' })
    `
    )
    const instances = findInngestInstances(project)
    expect(instances).toHaveLength(2)
    expect(instances[0].variableName).toBe('inngest1')
    expect(instances[1].variableName).toBe('inngest2')
  })
})

describe('analyzeProject - simple-function', () => {
  it('detects a simple function with event trigger and steps', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['simple-function.ts'],
    })

    expect(result.functions.length).toBeGreaterThanOrEqual(1)
    const fn = result.functions.find((f) => f.id === 'process-order')
    expect(fn).toBeDefined()
    expect(fn!.triggers).toHaveLength(1)
    expect(fn!.triggers[0].type).toBe('event')
    expect((fn!.triggers[0] as any).event).toBe('order/created')
    expect(fn!.steps).toHaveLength(2)
    expect(fn!.steps[0].id).toBe('get-user')
    expect(fn!.steps[0].type).toBe('run')
    expect(fn!.steps[1].id).toBe('send-email')
    expect(fn!.steps[1].type).toBe('run')
  })
})

describe('analyzeProject - multi-step', () => {
  it('detects all step types', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['multi-step.ts'],
    })

    const fn = result.functions.find((f) => f.id === 'multi-step-fn')
    expect(fn).toBeDefined()
    expect(fn!.steps).toHaveLength(6)

    expect(fn!.steps[0]).toMatchObject({ id: 'fetch-data', type: 'run' })
    expect(fn!.steps[1]).toMatchObject({ id: 'wait-a-bit', type: 'sleep', duration: '1h' })
    expect(fn!.steps[2]).toMatchObject({ id: 'wait-until', type: 'sleepUntil' })
    expect(fn!.steps[3]).toMatchObject({
      id: 'wait-approval',
      type: 'waitForEvent',
      waitEventName: 'approval/received',
      waitTimeout: '24h',
    })
    expect(fn!.steps[4]).toMatchObject({ id: 'notify', type: 'sendEvent', sendEventName: 'notification/sent' })
    expect(fn!.steps[5]).toMatchObject({ id: 'call-other', type: 'invoke', invokeTarget: 'other-function' })
  })
})

describe('analyzeProject - cron-trigger', () => {
  it('detects cron trigger', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['cron-trigger.ts'],
    })

    const fn = result.functions.find((f) => f.id === 'daily-cleanup')
    expect(fn).toBeDefined()
    expect(fn!.triggers).toHaveLength(1)
    expect(fn!.triggers[0].type).toBe('cron')
    expect((fn!.triggers[0] as any).cron).toBe('0 3 * * *')
    expect(fn!.steps).toHaveLength(2)
  })
})

describe('analyzeProject - nested-steps', () => {
  it('detects nested steps with correct depth', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['nested-steps.ts'],
    })

    const badFn = result.functions.find((f) => f.id === 'bad-function')
    expect(badFn).toBeDefined()

    const outerStep = badFn!.steps.find((s) => s.id === 'outer')
    expect(outerStep).toBeDefined()
    expect(outerStep!.depth).toBe(0)

    const innerStep = badFn!.steps.find((s) => s.id === 'inner')
    expect(innerStep).toBeDefined()
    expect(innerStep!.depth).toBe(1)
    expect(innerStep!.parentStepId).toBe('outer')

    const goodFn = result.functions.find((f) => f.id === 'good-function')
    expect(goodFn).toBeDefined()
    expect(goodFn!.steps.every((s) => s.depth === 0)).toBe(true)
  })
})

describe('analyzeProject - fan-out', () => {
  it('detects fan-out pattern with event sends', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['fan-out.ts'],
    })

    expect(result.functions).toHaveLength(3)

    const orchestrator = result.functions.find((f) => f.id === 'orchestrator')
    expect(orchestrator).toBeDefined()
    expect(orchestrator!.sends).toHaveLength(3)
    expect(orchestrator!.sends.map((s) => s.eventName).sort()).toEqual([
      'order/billing',
      'order/notification',
      'order/shipping',
    ])

    // EventMap should link senders to triggers
    expect(result.eventMap['order/billing']).toBeDefined()
    expect(result.eventMap['order/billing'].senders).toHaveLength(1)
    expect(result.eventMap['order/billing'].triggers).toHaveLength(1)
    expect(result.eventMap['order/billing'].triggers[0].functionId).toBe('billing-handler')
  })
})

describe('analyzeProject - wait-for-event', () => {
  it('detects waitForEvent and event sends', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['wait-for-event.ts'],
    })

    const workflow = result.functions.find((f) => f.id === 'approval-workflow')
    expect(workflow).toBeDefined()
    expect(workflow!.waitsFor).toHaveLength(1)
    expect(workflow!.waitsFor[0]).toMatchObject({
      stepId: 'wait-for-approval',
      eventName: 'approval/decision',
      timeout: '48h',
    })

    // EventMap
    expect(result.eventMap['approval/decision']).toBeDefined()
    expect(result.eventMap['approval/decision'].waiters).toHaveLength(1)
    expect(result.eventMap['approval/decision'].senders).toHaveLength(1)
  })
})

describe('analyzeProject - config-function', () => {
  it('extracts function config', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['config-function.ts'],
    })

    const fn = result.functions.find((f) => f.id === 'configured-fn')
    expect(fn).toBeDefined()
    expect(fn!.config).toMatchObject({
      concurrency: { limit: 5, key: 'event.data.userId', scope: 'fn' },
      throttle: { limit: 10, period: '1m', key: 'event.data.teamId' },
      retries: 3,
      rateLimit: { limit: 100, period: '1h', key: 'event.data.apiKey' },
      debounce: { period: '5s', key: 'event.data.userId' },
      batchEvents: { maxSize: 50, timeout: '10s' },
      idempotency: 'event.data.orderId',
      cancelOn: [{ event: 'order/cancelled', match: 'data.orderId', timeout: '24h' }],
      priority: { run: 'event.data.priority' },
    })
  })
})

describe('analyzeProject - dynamic-event', () => {
  it('detects dynamic event sends', () => {
    const result = analyzeProject(FIXTURES_DIR, {
      include: ['dynamic-event.ts'],
    })

    const fn = result.functions.find((f) => f.id === 'dynamic-fn')
    expect(fn).toBeDefined()
    expect(fn!.sends.length).toBeGreaterThanOrEqual(1)

    // Template literal send should be detected as dynamic
    const dynamicSend = fn!.sends.find((s) => s.isDynamic)
    expect(dynamicSend).toBeDefined()
  })
})

describe('analyzeProject - all fixtures', () => {
  it('analyzes all fixtures without errors', () => {
    const result = analyzeProject(FIXTURES_DIR)

    expect(result.analyzedFiles).toBeGreaterThan(0)
    expect(result.functions.length).toBeGreaterThanOrEqual(8)
    expect(result.analysisTimeMs).toBeGreaterThanOrEqual(0)

    // No error-level diagnostics
    const errors = result.diagnostics.filter((d) => d.level === 'error')
    expect(errors).toHaveLength(0)
  })
})
