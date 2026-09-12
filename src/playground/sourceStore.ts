import { create } from 'zustand'
import { examples } from '../examples'
import { loadPersistedContent } from './persist'
import type { PlaygroundMode } from './types'

const fallback = examples[0]!
const restored = typeof window === 'undefined' ? null : loadPersistedContent()
const hasCustom = Boolean(restored?.grammar)

export interface SourceState {
  mode: PlaygroundMode
  exampleId: string
  grammar: string
  tokens: string
  highlight: string
  context: string
  sample: string
  referenceSample: string
  shareBlocked: boolean
  awaitingCompile: boolean
  setGrammar: (grammar: string) => void
  setTokens: (tokens: string) => void
  setHighlight: (highlight: string) => void
  setContext: (context: string) => void
  setSample: (sample: string) => void
  setReferenceSample: (referenceSample: string) => void
}

export const useSourceStore = create<SourceState>((set) => ({
  mode: restored?.mode ?? { kind: 'custom' },
  exampleId: restored ? '' : fallback.id,
  grammar: hasCustom ? restored!.grammar : fallback.grammar,
  tokens: hasCustom ? restored!.tokens : fallback.tokens,
  highlight: hasCustom ? restored!.highlight : fallback.highlight,
  context: hasCustom ? restored!.context : fallback.context,
  sample: hasCustom ? restored!.sample : fallback.sample,
  referenceSample: restored?.referenceSample ?? '',
  shareBlocked: false,
  awaitingCompile: restored != null && restored.mode.kind === 'custom',
  setGrammar: (grammar) => set({ grammar }),
  setTokens: (tokens) => set({ tokens }),
  setHighlight: (highlight) => set({ highlight }),
  setContext: (context) => set({ context }),
  setSample: (sample) => set({ sample }),
  setReferenceSample: (referenceSample) => set({ referenceSample }),
}))
