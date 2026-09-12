import type { EditorDiagnostic, ExternalTab } from './types'

export function joinExternal(
  tokens: string,
  highlight: string,
  context: string,
): { code: string; parts: { id: ExternalTab; from: number; to: number }[] } {
  const parts: { id: ExternalTab; from: number; to: number }[] = []
  const chunks: string[] = []
  let offset = 0
  for (const id of ['tokens', 'highlight', 'context'] as const) {
    const text = { tokens, highlight, context }[id]
    if (!text.trim()) continue
    if (chunks.length) {
      chunks.push('\n\n')
      offset += 2
    }
    const from = offset
    chunks.push(text)
    offset += text.length
    parts.push({ id, from, to: offset })
  }
  return { code: chunks.join(''), parts }
}

export function diagnosticsForTab(
  diagnostics: EditorDiagnostic[],
  tab: ExternalTab,
  tokens: string,
  highlight: string,
  context: string,
): EditorDiagnostic[] {
  const { parts } = joinExternal(tokens, highlight, context)
  const part = parts.find((item) => item.id === tab)
  const first = parts[0]
  const result: EditorDiagnostic[] = []
  for (const diagnostic of diagnostics) {
    const fileLevel = diagnostic.from === 0 && diagnostic.to === 0
    if (fileLevel) {
      if (first?.id === tab) result.push(diagnostic)
      continue
    }
    if (!part || diagnostic.from < part.from || diagnostic.from >= part.to) continue
    result.push({
      ...diagnostic,
      from: diagnostic.from - part.from,
      to: Math.max(diagnostic.from, Math.min(diagnostic.to, part.to)) - part.from,
    })
  }
  return result
}
