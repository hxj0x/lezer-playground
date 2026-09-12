export type StatusKind = '' | 'ok' | 'err'
export type HoverSource = 'ast' | 'sample'

export type PlaygroundMode = { kind: 'custom' } | { kind: 'reference'; languageId: string }

export interface SyncRange {
  srcFrom: number
  srcTo: number
  lineFrom: number
  lineTo: number
  source: HoverSource
}

export interface SelectionRequest {
  from: number
  to: number
  nonce: number
}

export interface EditorDiagnostic {
  from: number
  to: number
  severity: 'error' | 'warning'
  message: string
}

export type ExternalTab = 'tokens' | 'highlight' | 'context'
