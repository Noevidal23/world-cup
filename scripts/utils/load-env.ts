import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const loadEnvFile = (file = '.env') => {
  const path = resolve(process.cwd(), file)

  if (!existsSync(path)) {
    return
  }

  const lines = readFileSync(path, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()

    if (!key || process.env[key] !== undefined) {
      continue
    }

    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}
