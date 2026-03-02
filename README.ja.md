# inngest-tools

Inngest ステップ関数の静的解析ツール群。TypeScript ソースコードを解析し、関数間のイベント依存関係の可視化やアンチパターンの検出を行います。

## インストール

```bash
npm install -g inngest-tools
# or
pnpm add -g inngest-tools
```

ライブラリとして利用する場合:

```bash
pnpm add @inngest-tools/core @inngest-tools/viz @inngest-tools/lint
```

## クイックスタート

```bash
# イベント依存グラフを Mermaid 形式で出力
inngest-tools viz ./src

# lint で問題を検出
inngest-tools lint ./src
```

## CLI コマンド

### `inngest-tools viz <target-dir>`

Inngest 関数間のイベント依存関係を可視化します。

```bash
inngest-tools viz ./src
inngest-tools viz ./src -f dot -o graph.dot
inngest-tools viz ./src -f html -o graph.html --direction TB --cluster
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `-f, --format <format>` | 出力形式 (`mermaid` \| `json` \| `dot` \| `html`) | `mermaid` |
| `-o, --output <path>` | 出力ファイルパス（省略時は stdout） | - |
| `--tsconfig <path>` | tsconfig.json のパス | 自動検出 |
| `--ignore <patterns...>` | 無視するファイルパターン | - |
| `--no-orphans` | 接続のないノードを非表示 | 表示 |
| `--cluster` | ファイルパスでグループ化 | `false` |
| `--direction <dir>` | グラフ方向 (`LR` \| `TB` \| `RL` \| `BT`) | `LR` |

#### 出力形式

- **mermaid** — Mermaid 記法。Markdown に埋め込んで GitHub/Notion 等で表示可能
- **dot** — Graphviz DOT 形式。`dot -Tpng graph.dot -o graph.png` で画像化
- **json** — VizGraph 構造体の JSON。プログラムからの利用向け
- **html** — D3.js force-directed graph のインタラクティブ HTML。フィルタ・ドラッグ・ズーム対応

### `inngest-tools lint <target-dir>`

Inngest 関数のアンチパターンや設定ミスを検出します。

```bash
inngest-tools lint ./src
inngest-tools lint ./src --format json -o report.json
inngest-tools lint ./src --rule no-nested-steps:off --max-warnings 5
inngest-tools lint ./src --format sarif -o results.sarif
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--format <format>` | 出力形式 (`text` \| `json` \| `sarif`) | `text` |
| `-o, --output <path>` | 出力ファイルパス（省略時は stdout） | - |
| `--tsconfig <path>` | tsconfig.json のパス | 自動検出 |
| `--ignore <patterns...>` | 無視するファイルパターン | - |
| `--rule <rules...>` | ルール severity の上書き (例: `no-nested-steps:off`) | - |
| `--max-warnings <n>` | 警告数上限（超過で exit code 1、-1 で無制限） | `-1` |

#### 終了コード

| コード | 意味 |
|---|---|
| `0` | 問題なし |
| `1` | エラー検出、または警告が `--max-warnings` を超過 |
| `2` | 実行エラー（ディレクトリ不在、設定不正 等） |

#### Lint ルール一覧

**Correctness（正確性）**

| ルール | デフォルト | 説明 |
|---|---|---|
| `no-nested-steps` | error | `step.run()` の中で別の `step.*` を呼び出している |
| `unique-step-ids` | error | 同一関数内でステップ ID が重複している |
| `unique-function-ids` | error | プロジェクト全体で関数 ID が重複している |
| `valid-cron` | error | cron 式が不正 |

**Best Practice（推奨パターン）**

| ルール | デフォルト | 説明 |
|---|---|---|
| `event-has-listener` | warning | 送信されたイベントにリスナーがない |
| `no-orphan-functions` | warning | イベントトリガーの関数に送信元がない |
| `no-side-effects-outside-steps` | warning | ステップなしの関数はリトライ時に全処理が再実行される |

**Performance（性能）**

| ルール | デフォルト | 説明 |
|---|---|---|
| `sleep-duration-warn` | warning | sleep の duration が長すぎる（デフォルト 7 日超） |
| `concurrency-config` | warning | concurrency / throttle / rateLimit の設定値が不正 |

## 設定ファイル

プロジェクトルートに `.inngest-tools.json` を配置すると、デフォルト設定を変更できます。CLI オプションが優先されます。

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
      "sleep-duration-warn": "off"
    },
    "sleepDurationMaxDays": 14,
    "knownExternalEvents": ["webhook/received", "stripe/charge.completed"]
  }
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `targetDir` | `string` | 解析対象ディレクトリ |
| `tsconfig` | `string` | tsconfig.json のパス |
| `ignore` | `string[]` | 無視する glob パターン |
| `viz.defaultFormat` | `"mermaid" \| "json" \| "dot" \| "html"` | viz のデフォルト出力形式 |
| `viz.direction` | `"LR" \| "TB" \| "RL" \| "BT"` | グラフ方向 |
| `viz.showOrphans` | `boolean` | 孤立ノードの表示 |
| `viz.clusterByFile` | `boolean` | ファイルでグループ化 |
| `lint.rules` | `Record<string, Severity>` | ルール severity の上書き |
| `lint.sleepDurationMaxDays` | `number` | sleep-duration-warn の閾値（日数） |
| `lint.knownExternalEvents` | `string[]` | 外部から送信されるイベント（orphan 警告を抑制） |

`Severity`: `"error"` | `"warning"` | `"info"` | `"off"`

## ライブラリとしての利用

### @inngest-tools/core

TypeScript ソースコードを解析し、Inngest 関数の構造情報を抽出します。

```typescript
import { analyzeProject } from '@inngest-tools/core'

const result = analyzeProject('./src', {
  tsConfigPath: './tsconfig.json',
  ignore: ['**/*.test.ts'],
})

console.log(`${result.functions.length} functions found`)
console.log(`${Object.keys(result.eventMap).length} events tracked`)

for (const fn of result.functions) {
  console.log(`${fn.id} (${fn.relativePath}:${fn.line})`)
  console.log(`  triggers: ${fn.triggers.map(t => t.type === 'event' ? t.event : t.cron).join(', ')}`)
  console.log(`  steps: ${fn.steps.map(s => `${s.type}(${s.id})`).join(', ')}`)
  console.log(`  sends: ${fn.sends.map(s => s.eventName).join(', ')}`)
}
```

#### 主要な型

```typescript
interface ProjectAnalysis {
  functions: InngestFunction[]   // 検出された関数
  eventMap: EventMap             // イベント依存マップ
  diagnostics: AnalysisDiagnostic[]
  analyzedFiles: number
  analysisTimeMs: number
}

interface InngestFunction {
  id: string                     // 関数 ID
  filePath: string               // ファイルパス
  triggers: Trigger[]            // event / cron トリガー
  steps: Step[]                  // step.run / sleep / waitForEvent 等
  sends: EventSend[]             // inngest.send / step.sendEvent
  waitsFor: EventWait[]          // step.waitForEvent
  config: FunctionConfig         // concurrency / throttle / retries 等
}
```

### @inngest-tools/viz

解析結果からグラフを生成し、複数の形式でレンダリングします。

```typescript
import { analyzeProject } from '@inngest-tools/core'
import { buildGraph, renderGraph, listFormats } from '@inngest-tools/viz'

const analysis = analyzeProject('./src')
const graph = buildGraph(analysis)

// レンダラーレジストリ経由
const mermaid = renderGraph('mermaid', graph, { direction: 'TB' })
const html = renderGraph('html', graph, { title: 'My Project' })

// 利用可能な形式一覧
console.log(listFormats()) // ['mermaid', 'json', 'dot', 'html']
```

個別のレンダラーを直接使うことも可能:

```typescript
import { renderMermaid } from '@inngest-tools/viz'
import { renderDot } from '@inngest-tools/viz'
import { renderHtml } from '@inngest-tools/viz'
import { renderJson } from '@inngest-tools/viz'
```

### @inngest-tools/lint

解析結果に対して lint ルールを実行します。

```typescript
import { analyzeProject } from '@inngest-tools/core'
import {
  lint,
  builtinRules,
  builtinProjectRules,
  formatText,
  formatJson,
  formatSarif,
} from '@inngest-tools/lint'

const analysis = analyzeProject('./src')

const result = lint(analysis, builtinRules, builtinProjectRules, {
  rules: {
    'no-nested-steps': 'error',
    'sleep-duration-warn': 'off',
  },
})

// テキスト出力（ESLint 風）
console.log(formatText(result))

// JSON 出力
console.log(formatJson(result, { pretty: true }))

// SARIF 出力（GitHub Code Scanning 連携）
fs.writeFileSync('results.sarif', formatSarif(result))
```

カスタムルールの作成:

```typescript
import type { LintRule } from '@inngest-tools/lint'

const myRule: LintRule = {
  id: 'my-custom-rule',
  description: 'My custom lint rule',
  defaultSeverity: 'warning',
  category: 'best-practice',
  check(fn, analysis) {
    const diagnostics = []
    if (fn.steps.length > 10) {
      diagnostics.push({
        ruleId: 'my-custom-rule',
        severity: 'warning',
        message: `Function "${fn.id}" has ${fn.steps.length} steps. Consider splitting.`,
        filePath: fn.filePath,
        line: fn.line,
      })
    }
    return diagnostics
  },
}

const result = lint(analysis, [...builtinRules, myRule], builtinProjectRules)
```

## パッケージ構成

```
packages/
  core/     @inngest-tools/core   — TypeScript AST 解析 (ts-morph)
  viz/      @inngest-tools/viz    — グラフ生成・レンダリング
  lint/     @inngest-tools/lint   — lint エンジン・ルール・レポーター
  cli/      inngest-tools         — CLI エントリポイント
```

## 開発

```bash
# 依存インストール
pnpm install

# 全パッケージビルド
pnpm build

# 全パッケージテスト
pnpm test

# 型チェック
pnpm typecheck

# クリーン
pnpm clean
```

## License

MIT
