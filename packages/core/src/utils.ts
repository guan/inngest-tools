import { Node, SyntaxKind } from 'ts-morph'

/**
 * ID をグラフノードの安全な識別子に変換する
 */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * AST ノードから文字列値を抽出する。
 * リテラル文字列はそのまま、テンプレートリテラルや変数参照は isDynamic として返す。
 */
export function extractStringValue(node: Node): {
  value: string | null
  isDynamic: boolean
  rawExpression?: string
} {
  // String literal
  if (Node.isStringLiteral(node)) {
    return { value: node.getLiteralValue(), isDynamic: false }
  }

  // No-substitution template literal (e.g., `hello`)
  if (Node.isNoSubstitutionTemplateLiteral(node)) {
    return { value: node.getLiteralValue(), isDynamic: false }
  }

  // Template literal with expressions
  if (Node.isTemplateExpression(node)) {
    return {
      value: null,
      isDynamic: true,
      rawExpression: node.getText(),
    }
  }

  // Identifier - try to resolve constant value
  if (Node.isIdentifier(node)) {
    const definitions = node.getDefinitionNodes()
    for (const def of definitions) {
      if (Node.isVariableDeclaration(def)) {
        const initializer = def.getInitializer()
        if (initializer && Node.isStringLiteral(initializer)) {
          return { value: initializer.getLiteralValue(), isDynamic: false }
        }
      }
    }
    return {
      value: null,
      isDynamic: true,
      rawExpression: node.getText(),
    }
  }

  // Property access (e.g., event.data.name)
  if (Node.isPropertyAccessExpression(node)) {
    return {
      value: null,
      isDynamic: true,
      rawExpression: node.getText(),
    }
  }

  // Fallback
  return {
    value: null,
    isDynamic: true,
    rawExpression: node.getText(),
  }
}

const DURATION_UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  w: 604800,
  week: 604800,
  weeks: 604800,
}

/**
 * Duration 文字列 (例: "1h", "30m", "7d") を秒数に変換する。
 * パースできない場合は null を返す。
 */
export function parseDuration(duration: string): number | null {
  const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/)
  if (!match) return null

  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  const multiplier = DURATION_UNITS[unit]

  if (multiplier === undefined) return null
  return value * multiplier
}

/**
 * オブジェクトリテラルのプロパティから文字列値を取得する
 */
export function getObjectStringProperty(
  node: Node,
  propertyName: string
): { value: string | null; isDynamic: boolean; rawExpression?: string } | undefined {
  if (!Node.isObjectLiteralExpression(node)) return undefined

  const prop = node.getProperty(propertyName)
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined

  const initializer = prop.getInitializer()
  if (!initializer) return undefined

  return extractStringValue(initializer)
}

/**
 * オブジェクトリテラルのプロパティから数値を取得する
 */
export function getObjectNumberProperty(
  node: Node,
  propertyName: string
): number | undefined {
  if (!Node.isObjectLiteralExpression(node)) return undefined

  const prop = node.getProperty(propertyName)
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined

  const initializer = prop.getInitializer()
  if (!initializer) return undefined

  if (Node.isNumericLiteral(initializer)) {
    return initializer.getLiteralValue()
  }

  return undefined
}
