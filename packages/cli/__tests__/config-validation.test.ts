import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { loadConfig } from '../src/config'

describe('config validation with zod', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inngest-tools-zod-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('accepts a valid full config', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({
        targetDir: './src',
        tsconfig: './tsconfig.json',
        ignore: ['**/*.test.ts'],
        viz: {
          defaultFormat: 'dot',
          direction: 'TB',
          showOrphans: false,
          clusterByFile: true,
        },
        lint: {
          rules: { 'no-nested-steps': 'off' },
          sleepDurationMaxDays: 14,
          knownExternalEvents: ['webhook/received'],
        },
      })
    )
    const config = loadConfig(tmpDir)
    expect(config.targetDir).toBe('./src')
    expect(config.viz?.defaultFormat).toBe('dot')
    expect(config.lint?.rules?.['no-nested-steps']).toBe('off')
  })

  it('rejects invalid types for known fields', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ ignore: 'not-an-array' })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects invalid viz config types', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ viz: { showOrphans: 'yes' } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects invalid lint config types', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ lint: { sleepDurationMaxDays: 'seven' } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('throws descriptive error for JSON parse failures', () => {
    fs.writeFileSync(path.join(tmpDir, '.inngest-tools.json'), '{invalid json}')
    expect(() => loadConfig(tmpDir)).toThrow('Failed to parse config file')
  })

  it('accepts empty config', () => {
    fs.writeFileSync(path.join(tmpDir, '.inngest-tools.json'), '{}')
    const config = loadConfig(tmpDir)
    expect(config).toEqual({})
  })

  it('accepts partial config', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ tsconfig: './tsconfig.app.json' })
    )
    const config = loadConfig(tmpDir)
    expect(config.tsconfig).toBe('./tsconfig.app.json')
    expect(config.viz).toBeUndefined()
  })

  it('rejects invalid viz format enum', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ viz: { defaultFormat: 'invalid-format' } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects invalid viz direction enum', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ viz: { direction: 'UP' } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects invalid lint rule severity', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ lint: { rules: { 'no-nested-steps': 'invalid' } } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects non-integer sleepDurationMaxDays', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ lint: { sleepDurationMaxDays: 3.5 } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('rejects negative sleepDurationMaxDays', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.inngest-tools.json'),
      JSON.stringify({ lint: { sleepDurationMaxDays: -1 } })
    )
    expect(() => loadConfig(tmpDir)).toThrow('Invalid config')
  })

  it('accepts all valid viz formats', () => {
    for (const fmt of ['mermaid', 'json', 'dot', 'html']) {
      fs.writeFileSync(
        path.join(tmpDir, '.inngest-tools.json'),
        JSON.stringify({ viz: { defaultFormat: fmt } })
      )
      const config = loadConfig(tmpDir)
      expect(config.viz?.defaultFormat).toBe(fmt)
    }
  })

  it('accepts all valid directions', () => {
    for (const dir of ['LR', 'TB', 'RL', 'BT']) {
      fs.writeFileSync(
        path.join(tmpDir, '.inngest-tools.json'),
        JSON.stringify({ viz: { direction: dir } })
      )
      const config = loadConfig(tmpDir)
      expect(config.viz?.direction).toBe(dir)
    }
  })

  it('accepts all valid severity values', () => {
    for (const sev of ['error', 'warning', 'info', 'off']) {
      fs.writeFileSync(
        path.join(tmpDir, '.inngest-tools.json'),
        JSON.stringify({ lint: { rules: { 'test-rule': sev } } })
      )
      const config = loadConfig(tmpDir)
      expect(config.lint?.rules?.['test-rule']).toBe(sev)
    }
  })
})
