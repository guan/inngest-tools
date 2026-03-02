import type { LintRule, ProjectLintRule } from '../types'
import { noNestedSteps } from './no-nested-steps'
import { uniqueStepIds } from './unique-step-ids'
import { uniqueFunctionIds } from './unique-function-ids'
import { validCron } from './valid-cron'
import { eventHasListener } from './event-has-listener'
import { noOrphanFunctions } from './no-orphan-functions'
import { noSideEffectsOutsideSteps } from './no-side-effects-outside-steps'
import { sleepDurationWarn } from './sleep-duration-warn'
import { concurrencyConfig } from './concurrency-config'

/** Per-function lint rules */
export const builtinRules: LintRule[] = [
  noNestedSteps,
  uniqueStepIds,
  validCron,
  noSideEffectsOutsideSteps,
  sleepDurationWarn,
  concurrencyConfig,
]

/** Project-level lint rules */
export const builtinProjectRules: ProjectLintRule[] = [
  uniqueFunctionIds,
  eventHasListener,
  noOrphanFunctions,
]
