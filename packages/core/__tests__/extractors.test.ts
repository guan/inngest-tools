import { describe, it, expect } from 'vitest'
import { Project, Node } from 'ts-morph'
import { extractObjectProperty, extractFunctionConfig } from '../src/extractors/config'
import { extractTriggers } from '../src/extractors/triggers'
import { extractWaits, STEP_METHODS } from '../src/extractors/steps'

function createInMemoryProject(code: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sf = project.createSourceFile('test.ts', code)
  return sf
}

function getFirstObjectLiteral(code: string) {
  const sf = createInMemoryProject(code)
  let result: ReturnType<typeof Node.isObjectLiteralExpression> extends true ? any : any
  sf.forEachDescendant((node) => {
    if (Node.isObjectLiteralExpression(node) && !result) {
      result = node
    }
  })
  return result
}

describe('extractObjectProperty', () => {
  it('extracts a nested object property', () => {
    const obj = getFirstObjectLiteral(`const x = { concurrency: { limit: 5 } }`)
    const result = extractObjectProperty(obj, 'concurrency', (init) => {
      const prop = init.getProperty('limit')
      if (prop && Node.isPropertyAssignment(prop)) {
        const val = prop.getInitializer()
        if (val && Node.isNumericLiteral(val)) return val.getLiteralValue()
      }
      return undefined
    })
    expect(result).toBe(5)
  })

  it('returns undefined for missing property', () => {
    const obj = getFirstObjectLiteral(`const x = { other: 1 }`)
    const result = extractObjectProperty(obj, 'concurrency', () => 'found')
    expect(result).toBeUndefined()
  })

  it('returns undefined when property is not an object', () => {
    const obj = getFirstObjectLiteral(`const x = { concurrency: 5 }`)
    const result = extractObjectProperty(obj, 'concurrency', () => 'found')
    expect(result).toBeUndefined()
  })
})

describe('extractFunctionConfig', () => {
  it('extracts all config properties', () => {
    const obj = getFirstObjectLiteral(`
      const config = {
        id: "test",
        concurrency: { limit: 10, key: "user", scope: "fn" },
        throttle: { limit: 5, period: "1m", key: "team" },
        retries: 3,
        rateLimit: { limit: 100, period: "1h" },
        debounce: { period: "5s", key: "user" },
        batchEvents: { maxSize: 50, timeout: "10s" },
        idempotency: "event.data.id",
        priority: { run: "event.data.priority" },
      }
    `)
    const config = extractFunctionConfig(obj)
    expect(config.concurrency).toEqual({ limit: 10, key: 'user', scope: 'fn' })
    expect(config.throttle).toEqual({ limit: 5, period: '1m', key: 'team' })
    expect(config.retries).toBe(3)
    expect(config.rateLimit).toEqual({ limit: 100, period: '1h', key: undefined })
    expect(config.debounce).toEqual({ period: '5s', key: 'user' })
    expect(config.batchEvents).toEqual({ maxSize: 50, timeout: '10s' })
    expect(config.idempotency).toBe('event.data.id')
    expect(config.priority).toEqual({ run: 'event.data.priority' })
  })

  it('returns empty config for non-object input', () => {
    const sf = createInMemoryProject(`const x = "string"`)
    let strNode: any
    sf.forEachDescendant((node) => {
      if (Node.isStringLiteral(node)) strNode = node
    })
    const config = extractFunctionConfig(strNode)
    expect(config).toEqual({})
  })

  it('handles config with cancelOn array', () => {
    const obj = getFirstObjectLiteral(`
      const config = {
        id: "test",
        cancelOn: [{ event: "order/cancelled", match: "data.orderId", timeout: "24h" }]
      }
    `)
    const config = extractFunctionConfig(obj)
    expect(config.cancelOn).toEqual([
      { event: 'order/cancelled', match: 'data.orderId', timeout: '24h' },
    ])
  })

  it('handles empty config object', () => {
    const obj = getFirstObjectLiteral(`const config = { id: "test" }`)
    const config = extractFunctionConfig(obj)
    expect(config.concurrency).toBeUndefined()
    expect(config.retries).toBeUndefined()
  })
})

describe('extractTriggers', () => {
  it('extracts event trigger from object', () => {
    const obj = getFirstObjectLiteral(`const t = { event: "order/created" }`)
    const triggers = extractTriggers(obj)
    expect(triggers).toHaveLength(1)
    expect(triggers[0]).toMatchObject({ type: 'event', event: 'order/created', isDynamic: false })
  })

  it('extracts cron trigger from object', () => {
    const obj = getFirstObjectLiteral(`const t = { cron: "0 3 * * *" }`)
    const triggers = extractTriggers(obj)
    expect(triggers).toHaveLength(1)
    expect(triggers[0]).toMatchObject({ type: 'cron', cron: '0 3 * * *' })
  })

  it('extracts triggers from array', () => {
    const sf = createInMemoryProject(`const t = [{ event: "e1" }, { cron: "* * * * *" }]`)
    let arrNode: any
    sf.forEachDescendant((node) => {
      if (Node.isArrayLiteralExpression(node)) arrNode = node
    })
    const triggers = extractTriggers(arrNode)
    expect(triggers).toHaveLength(2)
    expect(triggers[0].type).toBe('event')
    expect(triggers[1].type).toBe('cron')
  })

  it('extracts trigger from string shorthand', () => {
    const sf = createInMemoryProject(`const t = "order/created"`)
    let strNode: any
    sf.forEachDescendant((node) => {
      if (Node.isStringLiteral(node)) strNode = node
    })
    const triggers = extractTriggers(strNode)
    expect(triggers).toHaveLength(1)
    expect(triggers[0]).toMatchObject({ type: 'event', event: 'order/created', isDynamic: false })
  })

  it('returns empty for unrecognized node', () => {
    const sf = createInMemoryProject(`const t = 42`)
    let numNode: any
    sf.forEachDescendant((node) => {
      if (Node.isNumericLiteral(node)) numNode = node
    })
    const triggers = extractTriggers(numNode)
    expect(triggers).toHaveLength(0)
  })
})

describe('extractWaits', () => {
  it('extracts waits from waitForEvent steps', () => {
    const steps = [
      { id: 'step1', type: 'run' as const, line: 1, column: 1, depth: 0 },
      {
        id: 'wait-approval',
        type: 'waitForEvent' as const,
        line: 5,
        column: 1,
        depth: 0,
        waitEventName: 'approval/done',
        waitTimeout: '24h',
      },
    ]
    const waits = extractWaits(steps)
    expect(waits).toHaveLength(1)
    expect(waits[0]).toMatchObject({
      stepId: 'wait-approval',
      eventName: 'approval/done',
      isDynamic: false,
      timeout: '24h',
    })
  })

  it('returns empty for no waitForEvent steps', () => {
    const steps = [
      { id: 'step1', type: 'run' as const, line: 1, column: 1, depth: 0 },
    ]
    expect(extractWaits(steps)).toHaveLength(0)
  })

  it('marks wait as dynamic when eventName is undefined', () => {
    const steps = [
      { id: 'wait-dyn', type: 'waitForEvent' as const, line: 3, column: 1, depth: 0 },
    ]
    const waits = extractWaits(steps)
    expect(waits[0].isDynamic).toBe(true)
    expect(waits[0].eventName).toBeNull()
  })
})

describe('STEP_METHODS', () => {
  it('contains all expected step types', () => {
    expect(STEP_METHODS.has('run')).toBe(true)
    expect(STEP_METHODS.has('sleep')).toBe(true)
    expect(STEP_METHODS.has('sleepUntil')).toBe(true)
    expect(STEP_METHODS.has('waitForEvent')).toBe(true)
    expect(STEP_METHODS.has('sendEvent')).toBe(true)
    expect(STEP_METHODS.has('invoke')).toBe(true)
    expect(STEP_METHODS.has('unknown')).toBe(false)
  })
})
