import type { EditorDiagnostic } from './types'

export function locFromLezerMessage(message: string): { line: number; ch: number } | null {
  const match = message.match(/\((\d+):(\d+)\)\s*$/)
  if (!match) return null
  return { line: Number(match[1]), ch: Number(match[2]) }
}

export function offsetAt(doc: string, line1: number, ch0: number): number {
  let line = 1
  let i = 0
  while (i < doc.length && line < line1) {
    if (doc.charCodeAt(i) === 10) line++
    i++
  }
  return Math.min(doc.length, i + Math.max(0, ch0))
}

export function diagnosticFromMessage(
  message: string,
  doc: string,
  severity: 'error' | 'warning',
): EditorDiagnostic {
  const loc = locFromLezerMessage(message)
  if (!loc) return { from: 0, to: 0, severity, message }
  const from = offsetAt(doc, loc.line, loc.ch)
  const to = from < doc.length ? from + 1 : from
  return { from, to, severity, message }
}

export function diagnosticFromLine(
  message: string,
  doc: string,
  line1: number,
  ch0: number,
  severity: 'error' | 'warning',
): EditorDiagnostic {
  const from = offsetAt(doc, line1, ch0)
  const to = from < doc.length ? from + 1 : from
  return { from, to, severity, message }
}
