import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  CallExpression,
  type ObjectLiteralExpression,
} from 'ts-morph'
import * as path from 'node:path'
import type {
  InngestFunction,
  ProjectAnalysis,
  AnalyzeOptions,
  AnalysisDiagnostic,
  Trigger,
  EventTrigger,
  CronTrigger,
  Step,
  StepType,
  EventSend,
  EventWait,
  FunctionConfig,
  EventMap,
  FunctionRef,
} from './types'
import { createProject } from './resolver'
import {
  extractStringValue,
  getObjectStringProperty,
  getObjectNumberProperty,
} from './utils'
import {
  extractTriggers,
  extractFunctionConfig,
  extractSteps,
  extractSends,
  extractWaits,
  findStepParamName,
  findInngestParamName,
} from './extractors'

// ============================================================
// Internal types
// ============================================================

interface InngestInstance {
  variableName: string
  sourceFile: SourceFile
  line: number
}

// ============================================================
// Public API
// ============================================================

/**
 * メインエントリポイント: Inngest プロジェクトを解析する
 */
export function analyzeProject(
  targetDir: string,
  options?: AnalyzeOptions
): ProjectAnalysis {
  const startTime = Date.now()
  const resolvedDir = path.resolve(targetDir)
  const diagnostics: AnalysisDiagnostic[] = []

  const project = createProject({
    targetDir: resolvedDir,
    tsConfigPath: options?.tsConfigPath,
    ignore: options?.ignore,
    include: options?.include,
  })

  const instances = findInngestInstances(project)

  if (instances.length === 0) {
    diagnostics.push({
      level: 'warning',
      message: 'No Inngest instances found in the project',
    })
  }

  // Collect all variable names used for Inngest instances
  const instanceVarNames = new Set(instances.map((i) => i.variableName))

  const functions: InngestFunction[] = []

  // Search ALL project files for createFunction calls, not just the file
  // where the Inngest instance is defined (supports cross-file imports)
  for (const sourceFile of project.getSourceFiles()) {
    const fns = extractFunctionsFromFile(
      sourceFile,
      instanceVarNames,
      resolvedDir,
      diagnostics
    )
    functions.push(...fns)
  }

  const eventMap = buildEventMap(functions)

  return {
    functions,
    eventMap,
    diagnostics,
    analyzedFiles: project.getSourceFiles().length,
    analysisTimeMs: Date.now() - startTime,
  }
}

/**
 * EventMap を構築する
 */
export function buildEventMap(functions: InngestFunction[]): EventMap {
  const eventMap: EventMap = {}

  function getOrCreateEntry(eventName: string): EventMap[string] {
    if (!eventMap[eventName]) {
      eventMap[eventName] = { triggers: [], senders: [], waiters: [] }
    }
    return eventMap[eventName]
  }

  for (const fn of functions) {
    const ref: FunctionRef = {
      functionId: fn.id,
      filePath: fn.filePath,
      line: fn.line,
    }

    // Triggers
    for (const trigger of fn.triggers) {
      if (trigger.type === 'event' && trigger.event && !trigger.isDynamic) {
        getOrCreateEntry(trigger.event).triggers.push(ref)
      }
    }

    // Sends
    for (const send of fn.sends) {
      if (send.eventName && !send.isDynamic) {
        getOrCreateEntry(send.eventName).senders.push(ref)
      }
    }

    // Waits
    for (const wait of fn.waitsFor) {
      if (wait.eventName && !wait.isDynamic) {
        getOrCreateEntry(wait.eventName).waiters.push(ref)
      }
    }
  }

  return eventMap
}

// ============================================================
// Inngest Instance Detection
// ============================================================

/**
 * 全ソースファイルから `new Inngest(...)` を検出し、変数名を追跡する
 */
export function findInngestInstances(project: Project): InngestInstance[] {
  const instances: InngestInstance[] = []

  for (const sourceFile of project.getSourceFiles()) {
    // Find all `new Inngest(...)` expressions
    sourceFile.forEachDescendant((node) => {
      if (!Node.isNewExpression(node)) return
      const expr = node.getExpression()
      if (!Node.isIdentifier(expr)) return
      if (expr.getText() !== 'Inngest') return

      // Walk up to find the variable declaration
      const parent = node.getParent()
      if (parent && Node.isVariableDeclaration(parent)) {
        instances.push({
          variableName: parent.getName(),
          sourceFile,
          line: node.getStartLineNumber(),
        })
      }
    })
  }

  return instances
}

// ============================================================
// Function Extraction
// ============================================================

/**
 * ソースファイルから createFunction 呼び出しを全て検出し、
 * InngestFunction を構築する
 */
function extractFunctionsFromFile(
  sourceFile: SourceFile,
  instanceVarNames: Set<string>,
  basePath: string,
  diagnostics: AnalysisDiagnostic[]
): InngestFunction[] {
  const functions: InngestFunction[] = []

  sourceFile.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return

    const expr = node.getExpression()
    if (!Node.isPropertyAccessExpression(expr)) return
    if (expr.getName() !== 'createFunction') return

    const obj = expr.getExpression()
    if (!Node.isIdentifier(obj)) return
    if (!instanceVarNames.has(obj.getText())) return

    const fn = parseCreateFunction(node, sourceFile, basePath, diagnostics)
    if (fn) {
      functions.push(fn)
    }
  })

  return functions
}

/**
 * createFunction(config, trigger, handler) の呼び出しを解析する
 */
function parseCreateFunction(
  callExpr: CallExpression,
  sourceFile: SourceFile,
  basePath: string,
  diagnostics: AnalysisDiagnostic[]
): InngestFunction | null {
  const args = callExpr.getArguments()
  if (args.length < 3) {
    diagnostics.push({
      level: 'warning',
      message: `createFunction called with ${args.length} arguments, expected 3`,
      filePath: sourceFile.getFilePath(),
      line: callExpr.getStartLineNumber(),
    })
    return null
  }

  const [configArg, triggerArg, handlerArg] = args
  const filePath = sourceFile.getFilePath()
  const relativePath = path.relative(basePath, filePath)

  // Extract function ID from config
  const id = extractFunctionId(configArg, diagnostics, filePath)
  if (!id) return null

  // Extract triggers
  const triggers = extractTriggers(triggerArg)

  // Extract config
  const config = extractFunctionConfig(configArg)

  // Extract steps, sends, waits from handler
  const stepParamName = findStepParamName(handlerArg)
  const inngestParamName = findInngestParamName(callExpr)
  const steps = stepParamName ? extractSteps(handlerArg, stepParamName) : []
  const sends = extractSends(handlerArg, stepParamName, inngestParamName)
  const waitsFor = extractWaits(steps)

  return {
    id,
    filePath,
    relativePath,
    line: callExpr.getStartLineNumber(),
    column: callExpr.getStart() - callExpr.getStartLinePos() + 1,
    triggers,
    steps,
    sends,
    waitsFor,
    config,
  }
}

// ============================================================
// Function ID Extraction
// ============================================================

function extractFunctionId(
  configArg: Node,
  diagnostics: AnalysisDiagnostic[],
  filePath: string
): string | null {
  // Object form: { id: "the-id", ... }
  if (Node.isObjectLiteralExpression(configArg)) {
    const result = getObjectStringProperty(configArg, 'id')
    if (result?.value) return result.value

    diagnostics.push({
      level: 'warning',
      message: 'Could not extract function ID from config object',
      filePath,
      line: configArg.getStartLineNumber(),
    })
    return null
  }

  // String form: "the-id" (older API)
  if (Node.isStringLiteral(configArg)) {
    return configArg.getLiteralValue()
  }

  diagnostics.push({
    level: 'warning',
    message: 'Unexpected config argument format for createFunction',
    filePath,
    line: configArg.getStartLineNumber(),
  })
  return null
}
