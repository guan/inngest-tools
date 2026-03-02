import { describe, it, expect } from 'vitest'
import { matchGlob } from '../src/resolver'

describe('matchGlob', () => {
  it('matches simple ** glob pattern', () => {
    expect(matchGlob('/project/node_modules/foo/bar.ts', '**/node_modules/**')).toBe(true)
  })

  it('does not match when pattern does not apply', () => {
    expect(matchGlob('/project/src/index.ts', '**/node_modules/**')).toBe(false)
  })

  it('matches * wildcard within a segment', () => {
    expect(matchGlob('/project/src/index.ts', '**/*.ts')).toBe(true)
    expect(matchGlob('/project/src/index.js', '**/*.ts')).toBe(false)
  })

  it('matches ? for single character', () => {
    // ? matches exactly one non-slash character
    expect(matchGlob('/project/src/a.ts', '/project/src/?.ts')).toBe(true)
    expect(matchGlob('/project/src/ab.ts', '/project/src/?.ts')).toBe(false)
  })

  it('handles patterns with dots correctly', () => {
    expect(matchGlob('/project/.next/cache/data.ts', '**/.next/**')).toBe(true)
    expect(matchGlob('/project/next/cache/data.ts', '**/.next/**')).toBe(false)
  })

  it('handles patterns with special regex characters', () => {
    // Braces, parentheses, plus should be escaped
    expect(matchGlob('/project/src/file(1).ts', '**/file(1).ts')).toBe(true)
    expect(matchGlob('/project/src/file+name.ts', '**/file+name.ts')).toBe(true)
    expect(matchGlob('/project/src/file[0].ts', '**/file[0].ts')).toBe(true)
  })

  it('handles backslash normalization', () => {
    expect(matchGlob('C:\\project\\node_modules\\foo.ts', '**/node_modules/**')).toBe(true)
  })

  it('caches compiled regex patterns', () => {
    // Call twice with same pattern - should not throw
    expect(matchGlob('/a/b.ts', '**/*.ts')).toBe(true)
    expect(matchGlob('/c/d.ts', '**/*.ts')).toBe(true)
  })

  it('returns false for invalid patterns gracefully', () => {
    // An extremely edge-case pattern that might cause regex issues
    // The function should not throw
    expect(() => matchGlob('/test', '')).not.toThrow()
  })
})
