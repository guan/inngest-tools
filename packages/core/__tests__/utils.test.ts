import { describe, it, expect } from 'vitest'
import { sanitizeId, parseDuration } from '../src/utils'

describe('sanitizeId', () => {
  it('replaces slashes with underscores', () => {
    expect(sanitizeId('order/created')).toBe('order_created')
  })

  it('replaces dots with underscores', () => {
    expect(sanitizeId('my.event.name')).toBe('my_event_name')
  })

  it('preserves hyphens and alphanumeric', () => {
    expect(sanitizeId('my-function-1')).toBe('my-function-1')
  })

  it('replaces spaces', () => {
    expect(sanitizeId('my event')).toBe('my_event')
  })
})

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30)
    expect(parseDuration('1second')).toBe(1)
    expect(parseDuration('5seconds')).toBe(5)
  })

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(300)
    expect(parseDuration('1min')).toBe(60)
    expect(parseDuration('2minutes')).toBe(120)
  })

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(3600)
    expect(parseDuration('24hours')).toBe(86400)
  })

  it('parses days', () => {
    expect(parseDuration('7d')).toBe(604800)
    expect(parseDuration('1day')).toBe(86400)
  })

  it('parses weeks', () => {
    expect(parseDuration('1w')).toBe(604800)
    expect(parseDuration('2weeks')).toBe(1209600)
  })

  it('returns null for invalid input', () => {
    expect(parseDuration('invalid')).toBeNull()
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('abc123')).toBeNull()
  })
})
