import { Node } from 'ts-morph'
import type { Trigger, EventTrigger, CronTrigger } from '../types'
import { getObjectStringProperty } from '../utils'

/**
 * createFunction の第2引数からトリガー定義を抽出する
 */
export function extractTriggers(triggerArg: Node): Trigger[] {
  // Array form: [{ event: "..." }, { cron: "..." }]
  if (Node.isArrayLiteralExpression(triggerArg)) {
    return triggerArg
      .getElements()
      .flatMap((el) => extractTriggers(el))
  }

  // Object form: { event: "..." } or { cron: "..." }
  if (Node.isObjectLiteralExpression(triggerArg)) {
    const eventResult = getObjectStringProperty(triggerArg, 'event')
    if (eventResult) {
      return [
        {
          type: 'event',
          event: eventResult.value,
          isDynamic: eventResult.isDynamic,
          rawExpression: eventResult.rawExpression,
          line: triggerArg.getStartLineNumber(),
        } satisfies EventTrigger,
      ]
    }

    const cronResult = getObjectStringProperty(triggerArg, 'cron')
    if (cronResult?.value) {
      return [
        {
          type: 'cron',
          cron: cronResult.value,
          line: triggerArg.getStartLineNumber(),
        } satisfies CronTrigger,
      ]
    }
  }

  // String form: "event/name" (shorthand)
  if (Node.isStringLiteral(triggerArg)) {
    return [
      {
        type: 'event',
        event: triggerArg.getLiteralValue(),
        isDynamic: false,
        line: triggerArg.getStartLineNumber(),
      } satisfies EventTrigger,
    ]
  }

  return []
}
