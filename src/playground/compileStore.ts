import { create } from 'zustand'
import type { LanguageSupport } from '@codemirror/language'
import type { LRParser } from '@lezer/lr'
import type { AstIndexEntry } from '../ast/treeToAstText'
import { joinExternal } from './externalSource'
import { useSourceStore } from './sourceStore'
import type { EditorDiagnostic, StatusKind } from './types'

function initialExternal(): string {
  const { tokens, highlight, context } = useSourceStore.getState()
  return joinExternal(tokens, highlight, context).code
}

export interface CompileState {
  compiling: boolean
  autoCompile: boolean
  statusText: string
  statusKind: StatusKind
  languageSupport: LanguageSupport | null
  astText: string
  astIndex: AstIndexEntry[]
  warnings: string[]
  error: string | null
  liveHighlight: boolean
  grammarDiagnostics: EditorDiagnostic[]
  externalDiagnostics: EditorDiagnostic[]
  parser: LRParser | null
  compileGen: number
  lastSeenGrammar: string
  lastSeenExternal: string
  setAutoCompile: (autoCompile: boolean) => void
}

const awaiting = useSourceStore.getState().awaitingCompile

export const useCompileStore = create<CompileState>((set) => ({
  compiling: false,
  autoCompile: true,
  statusText: awaiting ? 'Restored session — compile to run' : 'Ready',
  statusKind: '',
  languageSupport: null,
  astText: '',
  astIndex: [],
  warnings: [],
  error: null,
  liveHighlight: false,
  grammarDiagnostics: [],
  externalDiagnostics: [],
  parser: null,
  compileGen: 0,
  lastSeenGrammar: useSourceStore.getState().grammar,
  lastSeenExternal: initialExternal(),
  setAutoCompile: (autoCompile) => set({ autoCompile }),
}))
