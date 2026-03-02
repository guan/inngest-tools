import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadConfig, mergeConfig } from '../src/config'

describe('loadConfig', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inngest-tools-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty object when no config file exists', () => {
    const config = loadConfig(tmpDir)
    expect(config).toEqual({})
  })

  it('loads .inngest-tools.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ targetDir: './src', tsconfig: './tsconfig.app.json' })
    )
    const config = loadConfig(tmpDir)
    expect(config.targetDir).toBe('./src')
    expect(config.tsconfig).toBe('./tsconfig.app.json')
  })

  it('loads inngest-tools.config.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'inngest-tools.config.json'),
      JSON.stringify({ ignore: ['**/*.test.ts'] })
    )
    const config = loadConfig(tmpDir)
    expect(config.ignore).toEqual(['**/*.test.ts'])
  })

  it('prefers .inngest-tools.json over inngest-tools.config.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ targetDir: 'from-dotfile' })
    )
    fs.writeFileSync(
      path.join(tmpDir, 'inngest-tools.config.json'),
      JSON.stringify({ targetDir: 'from-config' })
    )
    const config = loadConfig(tmpDir)
    expect(config.targetDir).toBe('from-dotfile')
  })

  it('throws on invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, '.inngest-tools.json'), '{invalid')
    expect(() => loadConfig(tmpDir)).toThrow('Failed to parse config file')
  })

  it('loads viz config', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({
        viz: { defaultFormat: 'dot', direction: 'TB', showOrphans: false, clusterByFile: true },
      })
    )
    const config = loadConfig(tmpDir)
    expect(config.viz?.defaultFormat).toBe('dot')
    expect(config.viz?.direction).toBe('TB')
    expect(config.viz?.showOrphans).toBe(false)
    expect(config.viz?.clusterByFile).toBe(true)
  })

  it('loads lint config', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({
        lint: {
          rules: { 'no-nested-steps': 'off', 'valid-cron': 'error' },
          sleepDurationMaxDays: 14,
          knownExternalEvents: ['external/webhook'],
        },
      })
    )
    const config = loadConfig(tmpDir)
    expect(config.lint?.rules?.['no-nested-steps']).toBe('off')
    expect(config.lint?.sleepDurationMaxDays).toBe(14)
    expect(config.lint?.knownExternalEvents).toEqual(['external/webhook'])
  })
})

describe('mergeConfig', () => {
  it('uses file config as defaults', () => {
    const result = mergeConfig(
      { format: undefined, direction: undefined } as Record<string, unknown>,
      { format: 'dot', direction: 'TB' }
    )
    expect(result.format).toBe('dot')
    expect(result.direction).toBe('TB')
  })

  it('CLI options override file config', () => {
    const result = mergeConfig(
      { format: 'mermaid', direction: 'LR' },
      { format: 'dot', direction: 'TB' }
    )
    expect(result.format).toBe('mermaid')
    expect(result.direction).toBe('LR')
  })

  it('undefined CLI options do not override', () => {
    const result = mergeConfig(
      { format: 'html', direction: undefined },
      { format: 'dot', direction: 'TB' }
    )
    expect(result.format).toBe('html')
    expect(result.direction).toBe('TB')
  })
})
