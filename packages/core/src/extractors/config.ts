import { Node, type ObjectLiteralExpression } from 'ts-morph'
import type { FunctionConfig } from '../types'
import { getObjectStringProperty, getObjectNumberProperty } from '../utils'

/**
 * Helper to extract a nested object property and transform it.
 * Reduces the repetitive pattern of:
 *   1. getProperty(name)
 *   2. check isPropertyAssignment
 *   3. getInitializer()
 *   4. check isObjectLiteralExpression
 *   5. extract fields
 */
export function extractObjectProperty<T>(
  parentObj: ObjectLiteralExpression,
  propName: string,
  extractor: (init: ObjectLiteralExpression) => T
): T | undefined {
  const prop = parentObj.getProperty(propName)
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined
  const init = prop.getInitializer()
  if (!init || !Node.isObjectLiteralExpression(init)) return undefined
  return extractor(init)
}

/**
 * createFunction の第1引数（config オブジェクト）から FunctionConfig を抽出する
 */
export function extractFunctionConfig(configArg: Node): FunctionConfig {
  if (!Node.isObjectLiteralExpression(configArg)) return {}

  const config: FunctionConfig = {}

  // concurrency
  config.concurrency = extractObjectProperty(configArg, 'concurrency', (init) => ({
    limit: getObjectNumberProperty(init, 'limit'),
    key: getObjectStringProperty(init, 'key')?.value ?? undefined,
    scope: (['fn', 'env', 'account'] as const).find(
      (s) => s === getObjectStringProperty(init, 'scope')?.value
    ),
  }))

  // throttle
  config.throttle = extractObjectProperty(configArg, 'throttle', (init) => ({
    limit: getObjectNumberProperty(init, 'limit'),
    period: getObjectStringProperty(init, 'period')?.value ?? undefined,
    key: getObjectStringProperty(init, 'key')?.value ?? undefined,
  }))

  // retries
  const retriesValue = getObjectNumberProperty(configArg, 'retries')
  if (retriesValue !== undefined) {
    config.retries = retriesValue
  }

  // rateLimit
  config.rateLimit = extractObjectProperty(configArg, 'rateLimit', (init) => ({
    limit: getObjectNumberProperty(init, 'limit'),
    period: getObjectStringProperty(init, 'period')?.value ?? undefined,
    key: getObjectStringProperty(init, 'key')?.value ?? undefined,
  }))

  // debounce
  config.debounce = extractObjectProperty(configArg, 'debounce', (init) => ({
    period: getObjectStringProperty(init, 'period')?.value ?? undefined,
    key: getObjectStringProperty(init, 'key')?.value ?? undefined,
  }))

  // batchEvents
  config.batchEvents = extractObjectProperty(configArg, 'batchEvents', (init) => ({
    maxSize: getObjectNumberProperty(init, 'maxSize'),
    timeout: getObjectStringProperty(init, 'timeout')?.value ?? undefined,
  }))

  // idempotency
  const idempotencyResult = getObjectStringProperty(configArg, 'idempotency')
  if (idempotencyResult?.value) {
    config.idempotency = idempotencyResult.value
  }

  // cancelOn
  const cancelOnProp = configArg.getProperty('cancelOn')
  if (cancelOnProp && Node.isPropertyAssignment(cancelOnProp)) {
    const init = cancelOnProp.getInitializer()
    if (init && Node.isArrayLiteralExpression(init)) {
      config.cancelOn = init.getElements().map((el) => {
        const eventResult = getObjectStringProperty(el, 'event')
        const matchResult = getObjectStringProperty(el, 'match')
        const timeoutResult = getObjectStringProperty(el, 'timeout')
        return {
          event: eventResult?.value ?? '',
          match: matchResult?.value ?? undefined,
          timeout: timeoutResult?.value ?? undefined,
        }
      })
    }
  }

  // priority
  config.priority = extractObjectProperty(configArg, 'priority', (init) => ({
    run: getObjectStringProperty(init, 'run')?.value ?? undefined,
  }))

  return config
}
