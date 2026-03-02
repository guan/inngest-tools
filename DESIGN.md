# inngest-tools 設計書

## 概要

Inngest のステップ関数プロジェクトに対する静的解析ツール群。TypeScript monorepo で構成し、以下の 2 つのサブコマンドを提供する。

- **`inngest-tools viz`** - 関数間のイベント依存関係を可視化
- **`inngest-tools lint`** - Inngest 関数のよくあるミス・アンチパターンを検出

## 背景・モチベーション

Inngest はイベント駆動でファンクション間が疎結合になる設計。これは保守性の面で優れているが、プロジェクトが成長すると以下の問題が発生する:

1. 「このイベントを listen している関数はどれか」が追えなくなる
2. `inngest.send()` で送信しているイベントに対応するリスナーが存在しないまま放置される
3. `step.run()` のネスト、step ID の重複など、実行時にしか発覚しないミスが潜む
4. cron トリガーの設定ミスがデプロイまで検出されない

これらを開発時に静的解析で検出し、フィードバックループを短くする。

---

## 技術スタック

| カテゴリ | 技術 | 理由 |
|----------|------|------|
| 言語 | TypeScript | Inngest ユーザーが 100% TS。ts-morph で AST 解析の精度が最も高い |
| AST 解析 | ts-morph | TypeScript Compiler API のラッパー。型情報も取得可能 |
| CLI | commander | 軽量でサブコマンドサポート |
| 出力装飾 | chalk | ターミナルカラー |
| monorepo | turborepo | ビルドキャッシュ、タスク並列実行 |
| ビルド | tsup | esbuild ベースで高速。CJS/ESM デュアル出力 |
| テスト | vitest | 高速、TypeScript ネイティブ |
| パッケージ管理 | pnpm workspaces | ディスク効率、厳格な依存解決 |
| リリース | changesets | monorepo のバージョン管理・npm publish |

---

## プロジェクト構造

```
inngest-tools/
├── packages/
│   ├── core/                    # 共通の静的解析エンジン
│   │   ├── src/
│   │   │   ├── index.ts         # パブリック API エクスポート
│   │   │   ├── types.ts         # 共通型定義
│   │   │   ├── parser.ts        # ts-morph でソース解析
│   │   │   ├── resolver.ts      # ファイル探索・Inngest 関数発見
│   │   │   └── utils.ts         # 共通ユーティリティ
│   │   ├── __tests__/
│   │   │   ├── parser.test.ts
│   │   │   ├── resolver.test.ts
│   │   │   └── fixtures/        # テスト用の Inngest ファイル群
│   │   │       ├── simple-function.ts
│   │   │       ├── multi-step.ts
│   │   │       ├── fan-out.ts
│   │   │       ├── wait-for-event.ts
│   │   │       ├── dynamic-event.ts
│   │   │       └── cron-trigger.ts
│   │   ├── package.json         # @inngest-tools/core
│   │   └── tsup.config.ts
│   │
│   ├── viz/                     # 可視化
│   │   ├── src/
│   │   │   ├── index.ts         # パブリック API
│   │   │   ├── graph.ts         # ProjectAnalysis → Graph 変換
│   │   │   ├── renderers/
│   │   │   │   ├── mermaid.ts   # Mermaid 記法出力
│   │   │   │   ├── html.ts      # インタラクティブ HTML（D3.js）
│   │   │   │   ├── json.ts      # JSON 出力
│   │   │   │   └── dot.ts       # Graphviz DOT 出力
│   │   │   └── templates/
│   │   │       └── interactive.html  # HTML テンプレート
│   │   ├── __tests__/
│   │   │   ├── graph.test.ts
│   │   │   └── renderers/
│   │   ├── package.json         # @inngest-tools/viz
│   │   └── tsup.config.ts
│   │
│   ├── lint/                    # Linter
│   │   ├── src/
│   │   │   ├── index.ts         # パブリック API
│   │   │   ├── engine.ts        # ルール実行エンジン
│   │   │   ├── rules/           # 各ルール実装
│   │   │   │   ├── index.ts     # ルール登録
│   │   │   │   ├── no-nested-steps.ts
│   │   │   │   ├── unique-step-ids.ts
│   │   │   │   ├── unique-function-ids.ts
│   │   │   │   ├── no-side-effects-outside-steps.ts
│   │   │   │   ├── valid-cron.ts
│   │   │   │   ├── event-has-listener.ts
│   │   │   │   ├── no-orphan-functions.ts
│   │   │   │   ├── sleep-duration-warn.ts
│   │   │   │   └── concurrency-config.ts
│   │   │   ├── reporter/        # 結果出力
│   │   │   │   ├── text.ts      # ターミナル出力（ESLint 風）
│   │   │   │   ├── json.ts      # JSON 出力
│   │   │   │   └── sarif.ts     # GitHub Code Scanning 連携
│   │   │   └── types.ts         # lint 固有の型
│   │   ├── __tests__/
│   │   │   ├── engine.test.ts
│   │   │   └── rules/           # 各ルールのテスト
│   │   ├── package.json         # @inngest-tools/lint
│   │   └── tsup.config.ts
│   │
│   └── cli/                     # CLI エントリポイント
│       ├── src/
│       │   ├── index.ts         # メインエントリ
│       │   ├── commands/
│       │   │   ├── viz.ts       # viz サブコマンド
│       │   │   └── lint.ts      # lint サブコマンド
│       │   └── config.ts        # 設定ファイル読み込み
│       ├── package.json         # inngest-tools (bin)
│       └── tsup.config.ts
│
├── .changeset/
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml               # テスト・ビルド
│       └── release.yml          # npm publish
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## core パッケージ詳細設計

### 型定義 (`packages/core/src/types.ts`)

```typescript
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
```

### パーサー (`packages/core/src/parser.ts`)

解析戦略:

1. **Inngest インスタンスの特定**
   - `new Inngest(...)` の呼び出しを検出
   - 変数名を追跡（`const inngest = new Inngest(...)` → 変数名 `inngest`）
   - re-export されたインスタンスも追跡

2. **createFunction の検出**
   - `<inngestVar>.createFunction(config, trigger, handler)` のパターンマッチ
   - 第1引数からfunction ID を抽出
   - 第2引数からトリガー定義を抽出
   - 第3引数（ハンドラ関数）の中身を解析

3. **ステップの検出**（ハンドラ関数の中）
   - `step.run("id", fn)` → StepType: 'run'
   - `step.sleep("id", duration)` → StepType: 'sleep'
   - `step.sleepUntil("id", date)` → StepType: 'sleepUntil'
   - `step.waitForEvent("id", opts)` → StepType: 'waitForEvent'
   - `step.sendEvent("id", event)` → StepType: 'sendEvent'
   - `step.invoke("id", opts)` → StepType: 'invoke'

4. **イベント送信の検出**
   - `inngest.send({ name: "..." })` → グローバル送信
   - `inngest.send([...])` → 配列送信
   - `step.sendEvent("id", { name: "..." })` → ステップ内送信

5. **動的な値の処理**
   - リテラル文字列 → そのまま抽出
   - テンプレートリテラル → `isDynamic: true`、rawExpression に元の式
   - 変数参照 → 定数の場合は値を解決、それ以外は `isDynamic: true`

```typescript
// 解析の疑似コード
export function analyzeProject(targetDir: string, options?: AnalyzeOptions): ProjectAnalysis {
  const startTime = Date.now()

  // 1. ts-morph Project を生成
  const project = createProject(targetDir, options)

  // 2. 全ソースファイルから Inngest インスタンスを探す
  const inngestInstances = findInngestInstances(project)

  // 3. 各インスタンスの createFunction 呼び出しを解析
  const functions: InngestFunction[] = []
  for (const instance of inngestInstances) {
    const fns = extractFunctions(instance, project)
    functions.push(...fns)
  }

  // 4. EventMap を構築
  const eventMap = buildEventMap(functions)

  // 5. 診断情報を収集
  const diagnostics = collectDiagnostics(functions, eventMap)

  return {
    functions,
    eventMap,
    diagnostics,
    analyzedFiles: project.getSourceFiles().length,
    analysisTimeMs: Date.now() - startTime,
  }
}
```

### リゾルバー (`packages/core/src/resolver.ts`)

```typescript
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

/**
 * tsconfig.json を探す。targetDir → 親ディレクトリを再帰的に探索
 */
export function findTsConfig(targetDir: string): string | undefined

/**
 * ts-morph Project を生成する
 * tsconfig がある場合はそれを使い、ない場合はデフォルト設定で生成
 */
export function createProject(options: ResolveOptions): Project
```

---

## viz パッケージ詳細設計

### グラフモデル (`packages/viz/src/graph.ts`)

```typescript
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
export function buildGraph(analysis: ProjectAnalysis): VizGraph
```

### レンダラー

#### Mermaid (`packages/viz/src/renderers/mermaid.ts`)

出力例:
```
graph LR
  subgraph Events
    E_order_created["order/created"]
    E_order_approved["order/approved"]
    E_order_processed["order/processed"]
  end

  subgraph Functions
    F_process_order["process-order<br/><small>src/inngest/order.ts:12</small>"]
    F_send_confirmation["send-confirmation<br/><small>src/inngest/email.ts:5</small>"]
  end

  E_order_created -->|triggers| F_process_order
  F_process_order -.->|waitForEvent| E_order_approved
  F_process_order -->|sends| E_order_processed
  E_order_processed -->|triggers| F_send_confirmation
```

#### HTML (`packages/viz/src/renderers/html.ts`)

D3.js force-directed graph をインラインで生成。機能:
- ノードのドラッグ
- ホバーでファイルパス・行番号表示
- クリックでステップ一覧を展開
- フィルタ（関数名、イベント名で絞り込み）
- ズーム・パン

#### JSON (`packages/viz/src/renderers/json.ts`)

VizGraph をそのまま JSON で出力。他ツールとの連携用。

#### DOT (`packages/viz/src/renderers/dot.ts`)

Graphviz DOT 形式。`dot -Tpng` でPNG生成可能。

### CLI オプション

```
inngest-tools viz <target-dir>

Options:
  -f, --format <format>   出力フォーマット (mermaid|html|json|dot)  [default: "mermaid"]
  -o, --output <path>     出力ファイルパス（省略時は stdout）
  --tsconfig <path>       tsconfig.json のパス
  --ignore <patterns...>  無視するファイルパターン
  --no-orphans            孤立ノード（接続のないイベント/関数）を非表示
  --cluster               ファイルパスでクラスタリング
  --direction <dir>       グラフの方向 (LR|TB|RL|BT)  [default: "LR"]
```

---

## lint パッケージ詳細設計

### ルール定義インターフェース (`packages/lint/src/types.ts`)

```typescript
export type Severity = 'error' | 'warning' | 'info' | 'off'

export interface LintRule {
  /** ルールID（例: "no-nested-steps"） */
  id: string
  /** 短い説明 */
  description: string
  /** デフォルトの重要度 */
  defaultSeverity: Severity
  /** ルールのカテゴリ */
  category: 'correctness' | 'best-practice' | 'performance' | 'consistency'
  /**
   * 個々の関数に対するチェック
   * ProjectAnalysis も渡すのでクロスファンクションチェックも可能
   */
  check(
    fn: InngestFunction,
    analysis: ProjectAnalysis
  ): LintDiagnostic[]
}

/** プロジェクト全体に対するチェック（関数横断） */
export interface ProjectLintRule {
  id: string
  description: string
  defaultSeverity: Severity
  category: 'correctness' | 'best-practice' | 'performance' | 'consistency'
  checkProject(analysis: ProjectAnalysis): LintDiagnostic[]
}

export interface LintDiagnostic {
  ruleId: string
  severity: Severity
  message: string
  filePath: string
  line: number
  column?: number
  /** 修正提案（将来の autofix 用） */
  fix?: {
    description: string
    replacement?: string
  }
}

export interface LintResult {
  diagnostics: LintDiagnostic[]
  /** ルールごとの集計 */
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  /** 実行時間（ms） */
  lintTimeMs: number
}
```

### 各ルールの仕様

#### `no-nested-steps` (correctness, error)

**検出:** `step.run()` のコールバック内で別の `step.*` メソッドが呼ばれている。

**理由:** Inngest のステップはフラットに並列/直列で実行される設計。ネストすると予期しない再実行が発生する。

```typescript
// NG
await step.run("outer", async () => {
  await step.run("inner", async () => { ... }) // ERROR
})

// OK
const data = await step.run("outer", async () => { ... })
await step.run("inner", async () => { use(data) })
```

**実装:** `step.run` の第2引数（コールバック）の AST を走査し、その中に `step.*` の呼び出しがないかチェック。

#### `unique-step-ids` (correctness, error)

**検出:** 同一関数内で同じステップID が複数回使われている。

**理由:** Inngest はステップID でメモイゼーションする。重複すると状態が上書きされる。

**実装:** 関数内の全ステップのIDを収集し、重複を検出。ただし条件分岐で排他的なパスにある場合は warning に下げる（完全な制御フロー解析は将来対応）。

#### `unique-function-ids` (correctness, error)

**検出:** プロジェクト全体で同じ function ID が複数の `createFunction` で使われている。

**理由:** Inngest はfunction IDでファンクションを一意に識別する。重複するとデプロイ時にどちらかが上書きされる。

**実装:** `ProjectLintRule` として実装。全関数のIDを収集し、重複を検出。

#### `no-side-effects-outside-steps` (best-practice, warning)

**検出:** ハンドラ関数の直下（`step.run` の外）で副作用のある処理を呼んでいる。

**理由:** Inngest はメモイゼーションのためにハンドラを複数回再実行する。step の外のコードは毎回実行されるため、API コールやDB書き込み等は step.run で囲む必要がある。

**検出対象:**
- `fetch()` / `axios.*` / `got.*` 等のHTTPクライアント呼び出し
- `console.log()` 以外の `console.*` （log は許容）
- `fs.*` の書き込み系メソッド
- `db.*` / `prisma.*` / `drizzle.*` 等のDB操作
- `await` を含む式（非同期処理は基本的に step 内で行うべき）

**除外:**
- 変数宣言・代入
- 純粋な計算
- `console.log` / `console.debug`
- `event.data` へのアクセス

**注意:** 完全な副作用解析は不可能なので、ヒューリスティクスベースで false positive は許容。設定で無効化可能にする。

#### `valid-cron` (correctness, error)

**検出:** cron トリガーの式が不正。

**実装:** cron-parser ライブラリで検証。5フィールドと6フィールド（秒付き）の両方をサポート。

#### `event-has-listener` (best-practice, warning)

**検出:** `inngest.send()` や `step.sendEvent()` で送信しているイベントに、対応するトリガーを持つ関数が存在しない。

**実装:** `ProjectLintRule`。eventMap を参照し、senders はあるが triggers が空のイベントを検出。動的イベント名 (`isDynamic: true`) はスキップ。

#### `no-orphan-functions` (best-practice, warning)

**検出:** イベントトリガーの関数で、そのイベントを送信する関数がプロジェクト内に存在しない。

**注意:** 外部からのイベント（webhook 等）は検出できないため、severity は warning。設定で特定イベントを除外リストに追加可能。

#### `sleep-duration-warn` (performance, warning)

**検出:** `step.sleep()` の duration が設定値（デフォルト7日）を超えている。

**理由:** 極端に長い sleep は設計ミスの可能性がある。意図的な場合は設定で閾値を変更。

**実装:** duration 文字列を parse して秒数に変換。閾値と比較。

#### `concurrency-config` (correctness, warning)

**検出:**
- `concurrency.limit` が 0 以下
- `concurrency.key` に存在しない変数参照がある
- `throttle` と `rateLimit` の矛盾した設定

---

## CLI パッケージ詳細設計

### コマンド体系

```
inngest-tools <command> [options]

Commands:
  viz <target-dir>     関数間のイベント依存を可視化
  lint <target-dir>    Inngest 関数の静的解析
  init                 設定ファイル (.inngest-tools.json) を生成

Global Options:
  --version            バージョン表示
  --help               ヘルプ表示
  --verbose            詳細ログ
  --quiet              エラーのみ出力
```

### lint コマンド

```
inngest-tools lint <target-dir> [options]

Options:
  --format <format>    出力フォーマット (text|json|sarif)  [default: "text"]
  -o, --output <path>  出力ファイルパス（省略時は stdout）
  --tsconfig <path>    tsconfig.json のパス
  --ignore <patterns>  無視するファイルパターン
  --rule <rule:severity>  ルールの severity を上書き（例: --rule sleep-duration-warn:off）
  --max-warnings <n>   warning の最大数。超えると exit code 1  [default: -1 (無制限)]
  --fix                自動修正可能なルールを修正（将来対応）
```

### 設定ファイル (`.inngest-tools.json`)

```json
{
  "targetDir": "./src",
  "tsconfig": "./tsconfig.json",
  "ignore": ["**/*.test.ts", "**/*.spec.ts"],
  "viz": {
    "defaultFormat": "mermaid",
    "direction": "LR",
    "showOrphans": true,
    "clusterByFile": false
  },
  "lint": {
    "rules": {
      "no-nested-steps": "error",
      "unique-step-ids": "error",
      "unique-function-ids": "error",
      "no-side-effects-outside-steps": "warning",
      "valid-cron": "error",
      "event-has-listener": "warning",
      "no-orphan-functions": "warning",
      "sleep-duration-warn": "warning",
      "concurrency-config": "warning"
    },
    "sleepDurationMaxDays": 7,
    "knownExternalEvents": [
      "webhook/*",
      "clerk/*"
    ]
  }
}
```

### Exit Codes

| Code | 意味 |
|------|------|
| 0 | 正常終了（lint: エラーなし） |
| 1 | lint でエラー検出、または --max-warnings 超過 |
| 2 | 設定エラー・解析失敗等の異常終了 |

---

## ビルド設定

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint:check": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### tsup.config.ts（各パッケージ共通パターン）

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

### CLI パッケージの tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  sourcemap: true,
})
```

---

## npm パッケージ構成

| パッケージ名 | 公開 | 説明 |
|-------------|------|------|
| `@inngest-tools/core` | npm | 静的解析エンジン（ライブラリとしても利用可能） |
| `@inngest-tools/viz` | npm | 可視化エンジン（ライブラリとしても利用可能） |
| `@inngest-tools/lint` | npm | Linter エンジン（ライブラリとしても利用可能） |
| `inngest-tools` | npm | CLI バイナリ（`npx inngest-tools` で実行） |

各パッケージはライブラリとしても単独利用可能にする。これにより:
- CI パイプラインで `@inngest-tools/lint` をプログラマティックに呼ぶ
- カスタムツールから `@inngest-tools/core` を使って独自の解析を行う
- VS Code 拡張等で `@inngest-tools/lint` を組み込む（将来）

---

## テスト戦略

### テスト用フィクスチャ (`packages/core/__tests__/fixtures/`)

実際の Inngest コードを模したテストファイル群を用意する。

```typescript
// fixtures/simple-function.ts
import { Inngest } from 'inngest'
const inngest = new Inngest({ id: 'test-app' })

export const processOrder = inngest.createFunction(
  { id: 'process-order' },
  { event: 'order/created' },
  async ({ event, step }) => {
    const user = await step.run('get-user', async () => {
      return { id: event.data.userId, email: 'test@example.com' }
    })
    await step.run('send-email', async () => {
      // send email
    })
    return { success: true }
  }
)
```

```typescript
// fixtures/nested-steps.ts (lint: no-nested-steps のテスト用)
export const badFunction = inngest.createFunction(
  { id: 'bad-function' },
  { event: 'test/bad' },
  async ({ step }) => {
    await step.run('outer', async () => {
      await step.run('inner', async () => {}) // ← 検出対象
    })
  }
)
```

### テストカバレッジ目標

- core パーサー: 90%+（解析精度が全体の品質を決める）
- lint ルール: 各ルール最低 5 ケース（正常系、異常系、エッジケース）
- viz レンダラー: スナップショットテスト

---

## 開発ロードマップ

### Phase 1: 基盤 + 最小 MVP（Week 1-2）

- [ ] monorepo セットアップ（pnpm, turbo, tsup, vitest）
- [ ] `@inngest-tools/core` - parser 実装
  - [ ] Inngest インスタンスの検出
  - [ ] createFunction の検出・引数解析
  - [ ] ステップの検出（run, sleep, waitForEvent, sendEvent, invoke）
  - [ ] イベント送信の検出
  - [ ] EventMap の構築
- [ ] `@inngest-tools/core` のテスト（フィクスチャ 6 種類）
- [ ] `@inngest-tools/viz` - Mermaid レンダラー
- [ ] `inngest-tools` CLI - viz サブコマンド
- [ ] 動作確認: 実際の Inngest プロジェクトで `npx inngest-tools viz ./src` が動く

### Phase 2: Linter（Week 3）

- [ ] `@inngest-tools/lint` - ルール実行エンジン
- [ ] ルール実装:
  - [ ] no-nested-steps
  - [ ] unique-step-ids
  - [ ] unique-function-ids
  - [ ] valid-cron
- [ ] text レポーター（ESLint 風出力）
- [ ] `inngest-tools` CLI - lint サブコマンド
- [ ] 各ルールのテスト

### Phase 3: 拡張（Week 4）

- [ ] lint 追加ルール:
  - [ ] event-has-listener
  - [ ] no-orphan-functions
  - [ ] no-side-effects-outside-steps
  - [ ] sleep-duration-warn
  - [ ] concurrency-config
- [ ] viz 追加レンダラー:
  - [ ] HTML（D3.js インタラクティブ）
  - [ ] JSON
  - [ ] DOT
- [ ] 設定ファイル（`.inngest-tools.json`）サポート
- [ ] SARIF レポーター（GitHub Code Scanning 連携）

### Phase 4: リリース準備（Week 5）

- [ ] README.md（GIF デモ付き）
- [ ] changesets 設定
- [ ] GitHub Actions CI/CD
- [ ] npm publish
- [ ] Inngest Discord / GitHub Discussions で告知
- [ ] Inngest 公式ブログへの寄稿を打診

---

## 将来の拡張案

- **VS Code 拡張**: `@inngest-tools/lint` をリアルタイムで実行し、エディタ上に波線表示
- **ESLint プラグイン**: `eslint-plugin-inngest` として lint ルールを ESLint に統合
- **watch モード**: ファイル変更を監視して自動で viz/lint を再実行
- **autofix**: 一部ルール（unique-step-ids 等）の自動修正
- **Python SDK 対応**: inngest-py の解析も追加
- **Go SDK 対応**: inngest-go の解析も追加
- **Inngest Dev Server 連携**: Dev Server の API から実行結果を取得し、静的解析と突合
