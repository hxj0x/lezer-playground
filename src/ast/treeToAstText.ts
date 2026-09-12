import type { Tree, TreeCursor } from '@lezer/common'

export interface AstIndexEntry {
  lineFrom: number
  lineTo: number
  srcFrom: number
  srcTo: number
  isError: boolean
}

export interface AstDump {
  text: string
  index: AstIndexEntry[]
}

export function treeToAstText(tree: Tree): AstDump {
  const lines: string[] = []
  const index: AstIndexEntry[] = []
  walk(tree.cursor(), '', lines, index)
  return { text: lines.join('\n'), index }
}

function walk(cursor: TreeCursor, indent: string, lines: string[], index: AstIndexEntry[]) {
  const entry: AstIndexEntry = {
    lineFrom: lines.length,
    lineTo: lines.length,
    srcFrom: cursor.from,
    srcTo: cursor.to,
    isError: cursor.type.isError,
  }
  index.push(entry)
  const name = cursor.type.name || '?'
  if (cursor.firstChild()) {
    lines.push(`${indent}${name} [${entry.srcFrom}-${entry.srcTo}] {`)
    const childIndent = `${indent}  `
    do {
      walk(cursor, childIndent, lines, index)
    } while (cursor.nextSibling())
    cursor.parent()
    lines.push(`${indent}}`)
    entry.lineTo = lines.length - 1
  } else {
    lines.push(`${indent}${name} [${entry.srcFrom}-${entry.srcTo}]`)
  }
}

export function findBySrc(index: AstIndexEntry[], pos: number): AstIndexEntry | null {
  if (index.length === 0) return null
  let p = pos
  const root = index[0]!
  if (p === root.srcTo && p > root.srcFrom) p = p - 1
  return innermostBy(
    index,
    p,
    (entry) => entry.srcFrom,
    (entry, value) => {
      const empty = entry.srcFrom === entry.srcTo && value === entry.srcFrom
      return empty || (value >= entry.srcFrom && value < entry.srcTo)
    },
  )
}

export function findByLine(index: AstIndexEntry[], line: number): AstIndexEntry | null {
  return innermostBy(
    index,
    line,
    (entry) => entry.lineFrom,
    (entry, value) => value >= entry.lineFrom && value <= entry.lineTo,
  )
}

export function lineSpan(
  text: string,
  lineFrom: number,
  lineTo: number,
): { from: number; to: number } | null {
  const starts: number[] = [0]
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1)
  }
  if (lineFrom < 0 || lineFrom >= starts.length) return null
  const from = starts[lineFrom]!
  const last = starts[Math.min(lineTo, starts.length - 1)]!
  const nl = text.indexOf('\n', last)
  const to = nl === -1 ? text.length : nl
  if (from < to) return { from, to }
  return from < text.length ? { from, to: from + 1 } : null
}

function innermostBy(
  index: AstIndexEntry[],
  value: number,
  start: (entry: AstIndexEntry) => number,
  contains: (entry: AstIndexEntry, value: number) => boolean,
): AstIndexEntry | null {
  let lo = 0
  let hi = index.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (start(index[mid]!) <= value) lo = mid + 1
    else hi = mid
  }
  for (let i = lo - 1; i >= 0; i--) {
    const entry = index[i]!
    if (contains(entry, value)) return entry
  }
  return null
}
