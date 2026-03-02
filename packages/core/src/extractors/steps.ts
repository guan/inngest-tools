import { Node, type CallExpression } from 'ts-morph'
import type { Step, StepType, EventSend, EventWait } from '../types'
import {
  extractStringValue,
  getObjectStringProperty,
} from '../utils'

// ============================================================
// Constants
// ============================================================

export const STEP_METHODS: Set<string> = new Set([
  'run', 'sleep', 'sleepUntil', 'waitForEvent', 'sendEvent', 'invoke',
])

// ============================================================
// Handler Function Utilities
// ============================================================

/**
 * ノードがアロー関数または関数式であれば返す
 */
export function getHandlerFunction(node: Node) {
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    return node
  }
  return null
}

/**
 * ハンドラ関数のパラメータから `step` の変数名を見つける。
 * async ({ event, step }) => { ... }  ->  "step"
 * async ({ step: s }) => { ... }  ->  "s"
 */
export function findStepParamName(handlerArg: Node): string | null {
  const fn = getHandlerFunction(handlerArg)
  if (!fn) return null

  const params = fn.getParameters()
  if (params.length === 0) return null

  const firstParam = params[0]
  const bindingPattern = firstParam.getNameNode()

  if (Node.isObjectBindingPattern(bindingPattern)) {
    for (const element of bindingPattern.getElements()) {
      const name = element.getNameNode()
      const propertyName = element.getPropertyNameNode()

      // { step } or { step: s }
      if (propertyName) {
        if (Node.isIdentifier(propertyName) && propertyName.getText() === 'step') {
          return name.getText()
        }
      } else if (Node.isIdentifier(name) && name.getText() === 'step') {
        return 'step'
      }
    }
  }

  return null
}

/**
 * createFunction の呼び出し元の Inngest インスタンス変数名を取得する
 */
export function findInngestParamName(callExpr: CallExpression): string | null {
  const expr = callExpr.getExpression()
  if (!Node.isPropertyAccessExpression(expr)) return null
  const obj = expr.getExpression()
  if (!Node.isIdentifier(obj)) return null
  return obj.getText()
}

// ============================================================
// Step Extraction
// ============================================================

/**
 * ハンドラ関数内の全 step.* 呼び出しを検出する
 */
export function extractSteps(handlerArg: Node, stepParamName: string): Step[] {
  const steps: Step[] = []
  const fn = getHandlerFunction(handlerArg)
  if (!fn) return steps

  fn.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return

    const expr = node.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) return

    const obj = expr.getExpression()
    if (!Node.isIdentifier(obj)) return
    if (obj.getText() !== stepParamName) return

    const methodName = expr.getName()
    if (!STEP_METHODS.has(methodName)) return

    const stepType = methodName as StepType
    const args = node.getArguments()

    // First argument is the step ID
    const idArg = args[0]
    const idResult = idArg ? extractStringValue(idArg) : null
    const id = idResult?.value ?? `<dynamic:${node.getStartLineNumber()}>`

    // Calculate depth and parent
    const { depth, parentStepId } = calculateStepDepth(node, stepParamName)

    const step: Step = {
      id,
      type: stepType,
      line: node.getStartLineNumber(),
      column: node.getStart() - node.getStartLinePos() + 1,
      depth,
      parentStepId,
    }

    // Extract type-specific metadata
    switch (stepType) {
      case 'sleep': {
        const durationArg = args[1]
        if (durationArg) {
          const result = extractStringValue(durationArg)
          step.duration = result.value ?? result.rawExpression
        }
        break
      }
      case 'sleepUntil': {
        const dateArg = args[1]
        if (dateArg) {
          const result = extractStringValue(dateArg)
          step.duration = result.value ?? result.rawExpression
        }
        break
      }
      case 'waitForEvent': {
        const optsArg = args[1]
        if (optsArg && Node.isObjectLiteralExpression(optsArg)) {
          const eventResult = getObjectStringProperty(optsArg, 'event')
          if (eventResult) {
            step.waitEventName = eventResult.value ?? undefined
          }
          const timeoutResult = getObjectStringProperty(optsArg, 'timeout')
          if (timeoutResult) {
            step.waitTimeout = timeoutResult.value ?? undefined
          }
        }
        break
      }
      case 'sendEvent': {
        const eventArg = args[1]
        if (eventArg) {
          if (Node.isObjectLiteralExpression(eventArg)) {
            const nameResult = getObjectStringProperty(eventArg, 'name')
            if (nameResult) {
              step.sendEventName = nameResult.value ?? undefined
            }
          }
        }
        break
      }
      case 'invoke': {
        const optsArg = args[1]
        if (optsArg && Node.isObjectLiteralExpression(optsArg)) {
          const fnResult = getObjectStringProperty(optsArg, 'function')
          if (fnResult) {
            step.invokeTarget = fnResult.value ?? undefined
          }
        }
        break
      }
    }

    steps.push(step)
  })

  return steps
}

/**
 * ステップのネスト深さと親ステップIDを計算する。
 * 現在のノードから上方向に走査し、step.run のコールバック内にいるかを確認。
 */
export function calculateStepDepth(
  node: Node,
  stepParamName: string
): { depth: number; parentStepId: string | undefined } {
  let depth = 0
  let parentStepId: string | undefined
  let current: Node | undefined = node.getParent()

  while (current) {
    // Check if we're inside a step.run callback
    if (Node.isCallExpression(current)) {
      const expr = current.getExpression()
      if (Node.isPropertyAccessExpression(expr)) {
        const obj = expr.getExpression()
        if (
          Node.isIdentifier(obj) &&
          obj.getText() === stepParamName &&
          expr.getName() === 'run'
        ) {
          // We are inside a step.run callback
          const args = current.getArguments()
          if (args.length > 0) {
            const idResult = extractStringValue(args[0])
            if (depth === 0) {
              parentStepId = idResult.value ?? undefined
            }
          }
          depth++
        }
      }
    }

    current = current.getParent()
  }

  return { depth, parentStepId }
}

// ============================================================
// Event Send Detection
// ============================================================

/**
 * ハンドラ関数内のイベント送信を検出する。
 * - step.sendEvent("id", { name: "..." }) -> ステップ内送信
 * - inngest.send({ name: "..." }) -> グローバル送信
 */
export function extractSends(
  handlerArg: Node,
  stepParamName: string | null,
  inngestVarName: string | null
): EventSend[] {
  const sends: EventSend[] = []
  const fn = getHandlerFunction(handlerArg)
  if (!fn) return sends

  fn.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return
    const expr = node.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) return

    const obj = expr.getExpression()
    if (!Node.isIdentifier(obj)) return
    const objName = obj.getText()
    const methodName = expr.getName()

    // step.sendEvent("id", eventPayload)
    if (objName === stepParamName && methodName === 'sendEvent') {
      const args = node.getArguments()
      if (args.length >= 2) {
        const eventArg = args[1]
        const send = extractEventPayload(eventArg, node.getStartLineNumber())
        if (send) {
          // Find the step ID
          const idResult = extractStringValue(args[0])
          send.fromStepId = idResult.value ?? undefined
          sends.push(send)
        }
      }
    }

    // inngest.send(eventPayload) or inngest.send([...])
    if (objName === inngestVarName && methodName === 'send') {
      const args = node.getArguments()
      if (args.length >= 1) {
        const eventArg = args[0]
        if (Node.isArrayLiteralExpression(eventArg)) {
          for (const el of eventArg.getElements()) {
            const send = extractEventPayload(el, el.getStartLineNumber())
            if (send) sends.push(send)
          }
        } else {
          const send = extractEventPayload(eventArg, node.getStartLineNumber())
          if (send) sends.push(send)
        }
      }
    }
  })

  return sends
}

/**
 * イベントペイロードオブジェクトから EventSend を構築する
 */
export function extractEventPayload(node: Node, line: number): EventSend | null {
  if (Node.isObjectLiteralExpression(node)) {
    const nameResult = getObjectStringProperty(node, 'name')
    if (nameResult) {
      return {
        eventName: nameResult.value,
        isDynamic: nameResult.isDynamic,
        rawExpression: nameResult.rawExpression,
        line,
      }
    }
  }

  return {
    eventName: null,
    isDynamic: true,
    rawExpression: node.getText(),
    line,
  }
}

// ============================================================
// Event Wait Extraction
// ============================================================

/**
 * step.waitForEvent のステップから EventWait を構築する
 */
export function extractWaits(steps: Step[]): EventWait[] {
  return steps
    .filter((s) => s.type === 'waitForEvent')
    .map((s) => ({
      stepId: s.id,
      eventName: s.waitEventName ?? null,
      isDynamic: s.waitEventName === undefined,
      timeout: s.waitTimeout,
      line: s.line,
    }))
}
