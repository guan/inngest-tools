import { Project } from 'ts-morph'
import * as path from 'node:path'
import * as fs from 'node:fs'
import type { ResolveOptions } from './types'

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/build/**',
]

/**
 * targetDir から親ディレクトリを再帰的に探索し、tsconfig.json を探す
 */
export function findTsConfig(targetDir: string): string | undefined {
  let dir = path.resolve(targetDir)
  const root = path.parse(dir).root

  while (dir !== root) {
    const candidate = path.join(dir, 'tsconfig.json')
    if (fs.existsSync(candidate)) {
      return candidate
    }
    dir = path.dirname(dir)
  }

  return undefined
}

/**
 * ts-morph Project を生成する。
 * tsconfig がある場合はそれを使い、ない場合はデフォルト設定でソースファイルを追加する。
 */
export function createProject(options: ResolveOptions): Project {
  const targetDir = path.resolve(options.targetDir)
  const tsConfigPath = options.tsConfigPath ?? findTsConfig(targetDir)

  const ignorePatterns = [...DEFAULT_IGNORE, ...(options.ignore ?? [])]

  if (tsConfigPath) {
    const project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    })

    // Add files from the target directory, not the entire tsconfig scope
    const includePatterns = options.include ?? ['**/*.ts', '**/*.tsx']
    for (const pattern of includePatterns) {
      project.addSourceFilesAtPaths(
        path.join(targetDir, pattern)
      )
    }

    // Remove files matching ignore patterns
    for (const sourceFile of project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath()
      if (ignorePatterns.some(p => matchGlob(filePath, p))) {
        project.removeSourceFile(sourceFile)
      }
    }

    return project
  }

  // No tsconfig found - create with default settings
  const project = new Project({
    compilerOptions: {
      target: 99, // ESNext
      module: 99, // ESNext
      moduleResolution: 100, // Bundler
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowJs: true,
    },
  })

  const includePatterns = options.include ?? ['**/*.ts', '**/*.tsx']
  for (const pattern of includePatterns) {
    project.addSourceFilesAtPaths(
      path.join(targetDir, pattern)
    )
  }

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath()
    if (ignorePatterns.some(p => matchGlob(filePath, p))) {
      project.removeSourceFile(sourceFile)
    }
  }

  return project
}

/**
 * Compiled regex cache for glob patterns to avoid repeated compilation.
 */
const globRegexCache = new Map<string, RegExp>()

/**
 * Simple glob matching for ignore patterns.
 * Supports ** (any path segment), * (any characters in segment),
 * and ? (single character). Properly escapes regex metacharacters.
 */
export function matchGlob(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/')

  let regex = globRegexCache.get(pattern)
  if (!regex) {
    try {
      const normalized = pattern.replace(/\\/g, '/')
      let regexStr = ''
      let i = 0
      while (i < normalized.length) {
        if (normalized[i] === '*' && normalized[i + 1] === '*') {
          // Globstar: match any path segments
          regexStr += '.*'
          i += 2
          // Skip trailing slash after **
          if (normalized[i] === '/') i++
        } else if (normalized[i] === '*') {
          // Wildcard: match any characters except path separator
          regexStr += '[^/]*'
          i++
        } else if (normalized[i] === '?') {
          regexStr += '[^/]'
          i++
        } else {
          // Escape regex metacharacters
          regexStr += normalized[i].replace(/[.+^${}()|[\]\\]/g, '\\$&')
          i++
        }
      }
      regex = new RegExp(regexStr)
      globRegexCache.set(pattern, regex)
    } catch {
      // If regex compilation fails, treat as non-match
      return false
    }
  }

  return regex.test(normalizedPath)
}
