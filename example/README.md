# inngest-tools Example Project

サンプルInngestプロジェクトの概要（テスト用fixture）

## Files

| ファイル | 関数 | パターン |
|----------|------|---------|
| `src/client.ts` | `inngest` (instance) | Inngest client |
| `src/orders.ts` | `processOrder`, `fulfillOrder`, `notifyCustomer` | Basic event trigger, fan-out, waitForEvent |
| `src/notifications.ts` | `sendEmailNotification`, `sendPushNotification` | Basic event trigger |
| `src/billing.ts` | `chargeBilling`, `throttledSync`, `cancellableSubscription` | Concurrency, Throttle, CancelOn |
| `src/analytics.ts` | `hourlyCrawl`, `generateReport`, `processAnalytics` | Cron, onFailure, step.invoke |
| `src/dynamic.ts` | `dynamicRouter` | Dynamic event names |
| `src/anti-patterns.ts` | 7 functions | Anti-patterns (lint detection targets) |

## Normal Patterns

| パターン名 | ファイル | 関数名 | 説明 |
|-----------|---------|--------|------|
| Basic event trigger | orders.ts | processOrder | イベントトリガーの基本形 |
| Fan-out | orders.ts | fulfillOrder | 複数ステップの並列処理 |
| waitForEvent | orders.ts | notifyCustomer | 外部イベント待機 |
| Basic event trigger | notifications.ts | sendEmailNotification | メール通知 |
| Basic event trigger | notifications.ts | sendPushNotification | プッシュ通知 |
| Concurrency control (per-key limit) | billing.ts | chargeBilling | アカウント単位で同時実行数を制限 |
| Throttle (rate limiting) | billing.ts | throttledSync | 1分あたりのリクエスト数を制限 |
| CancelOn (event-driven cancellation) | billing.ts | cancellableSubscription | キャンセルイベントで関数を中断 |
| Cron trigger (hourly) | analytics.ts | hourlyCrawl | 毎時cronで実行 |
| onFailure handler | analytics.ts | generateReport | 失敗時のハンドラ定義 |
| step.invoke (cross-function invocation) | analytics.ts | processAnalytics | 別のInngest関数を呼び出す |
| Dynamic event names (template literals) | dynamic.ts | dynamicRouter | テンプレートリテラルで動的イベント名を生成 |

## Anti-Patterns

| ルールID | ファイル | 関数名 | 説明 |
|---------|---------|--------|------|
| no-nested-steps | anti-patterns.ts | nestedSteps | step.run内で別のstep.runを呼ぶ |
| unique-step-ids | anti-patterns.ts | duplicateStepIds | 同一関数内で同じステップIDを重複使用 |
| no-side-effects-outside-steps | anti-patterns.ts | sideEffectsOutside | step外でfetch等の副作用処理を実行 |
| valid-cron | anti-patterns.ts | invalidCron | フィールド不足の不正なcron式（4フィールド） |
| event-has-listener | anti-patterns.ts | eventNoListener | リスナーが存在しないイベントを送信 |
| no-orphan-functions | anti-patterns.ts | orphanFunction | 誰も送信しないイベントでトリガーされる孤立関数 |
| sleep-duration-warn | anti-patterns.ts | longSleep | 推奨上限を超える長時間のsleep（30日） |

## Usage

```bash
cd example
pnpm install
pnpm typecheck  # tsc --noEmit
```
