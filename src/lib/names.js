import { BYE } from './bracket'

// One name per line. Duplicates get " (2)", " (3)"... and are always unique,
// because winners are tracked by name.
export function parseNames(text) {
  const used = new Set([BYE])
  return text
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => {
      let name = n
      for (let i = 2; used.has(name); i++) name = `${n} (${i})`
      used.add(name)
      return name
    })
}

export function nameError(names) {
  if (names.length < 2) return 'Enter at least 2 names.'
  if (names.length > 128) return 'Maximum is 128 names.'
  return ''
}
