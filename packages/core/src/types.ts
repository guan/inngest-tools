// ============================================================
// Inngest 関数の解析結果
// ============================================================

export interface InngestFunction {
  /** createFunction の第1引数の id */
  id: string
  /** ファイルの絶対パス */
  filePath: string
  /** 相対パス（プロジェクトルートから） */
  relativePath: string
  /** createFunction の行番号 */
  line: number
  /** カラム番号 */
  column: number
  /** トリガー定義 */
  triggers: Trigger[]
  /** ステップ一覧 */
  steps: Step[]
  /** イベント送信一覧 */
  sends: EventSend[]
  /** イベント待機一覧 */
  waitsFor: EventWait[]
  /** 関数設定 */
  config: FunctionConfig
}

// ============================================================
// トリガー
// ============================================================

export type Trigger = EventTrigger | CronTrigger

export interface EventTrigger {
  type: 'event'
  /** イベント名。動的な場合は null */
  event: string | null
  /** 動的な値かどうか */
  isDynamic: boolean
  /** ソース上の表現（動的な場合のデバッグ用） */
  rawExpression?: string
  line: number
}

export interface CronTrigger {
  type: 'cron'
  cron: string
  line: number
}

// ============================================================
// ステップ
// ============================================================

export interface Step {
  /** step.run / step.sleep 等の第1引数（ステップID） */
  id: string
  /** ステップの種類 */
  type: StepType
  /** 行番号 */
  line: number
  /** カラム番号 */
  column: number
  /** ネストの深さ（step.run の中の step.run は depth > 0） */
  depth: number
  /** step.sleep の場合のduration文字列 */
  duration?: string
  /** step.waitForEvent の場合の待機イベント名 */
  waitEventName?: string
  /** step.waitForEvent の場合のtimeout */
  waitTimeout?: string
  /** step.invoke の場合の呼び出し先関数ID */
  invokeTarget?: string
  /** step.sendEvent の場合の送信イベント名 */
  sendEventName?: string
  /** 親ステップのID（ネストしている場合） */
  parentStepId?: string
}

export type StepType =
  | 'run'
  | 'sleep'
  | 'sleepUntil'
  | 'waitForEvent'
  | 'sendEvent'
  | 'invoke'

// ============================================================
// イベント送信・待機
// ============================================================

export interface EventSend {
  /** イベント名 */
  eventName: string | null
  /** 動的な値かどうか */
  isDynamic: boolean
  /** ソース上の表現 */
  rawExpression?: string
  /** 送信元のステップID（step内からの場合） */
  fromStepId?: string
  line: number
}

export interface EventWait {
  /** step.waitForEvent のステップID */
  stepId: string
  /** 待機するイベント名 */
  eventName: string | null
  isDynamic: boolean
  rawExpression?: string
  /** タイムアウト */
  timeout?: string
  line: number
}

// ============================================================
// 関数設定
// ============================================================

export interface FunctionConfig {
  concurrency?: {
    limit?: number
    key?: string
    scope?: 'fn' | 'env' | 'account'
  }
  throttle?: {
    limit?: number
    period?: string
    key?: string
  }
  retries?: number
  rateLimit?: {
    limit?: number
    period?: string
    key?: string
  }
  debounce?: {
    period?: string
    key?: string
  }
  batchEvents?: {
    maxSize?: number
    timeout?: string
  }
  idempotency?: string
  cancelOn?: Array<{
    event: string
    match?: string
    timeout?: string
  }>
  priority?: {
    run?: string
  }
}

// ============================================================
// プロジェクト全体の解析結果
// ============================================================

export interface ProjectAnalysis {
  /** 検出された全 Inngest 関数 */
  functions: InngestFunction[]
  /** イベントの依存マップ */
  eventMap: EventMap
  /** 解析中のエラー・警告 */
  diagnostics: AnalysisDiagnostic[]
  /** 解析対象のファイル数 */
  analyzedFiles: number
  /** 解析にかかった時間（ms） */
  analysisTimeMs: number
}

export interface EventMap {
  [eventName: string]: {
    /** このイベントでトリガーされる関数 */
    triggers: FunctionRef[]
    /** このイベントを送信する関数 */
    senders: FunctionRef[]
    /** このイベントを waitForEvent する関数 */
    waiters: FunctionRef[]
  }
}

export interface FunctionRef {
  functionId: string
  filePath: string
  line: number
}

export interface AnalysisDiagnostic {
  level: 'error' | 'warning' | 'info'
  message: string
  filePath?: string
  line?: number
}

// ============================================================
// オプション
// ============================================================

export interface AnalyzeOptions {
  /** tsconfig.json のパス（省略時は自動検出） */
  tsConfigPath?: string
  /** 無視するパターン */
  ignore?: string[]
  /** 追加で含めるパターン */
  include?: string[]
}

export interface ResolveOptions {
  /** 解析対象ディレクトリ */
  targetDir: string
  /** tsconfig.json のパス（省略時は自動検出） */
  tsConfigPath?: string
  /** 無視するパターン */
  ignore?: string[]
  /** 追加で含めるパターン */
  include?: string[]
}
