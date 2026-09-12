import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { getReferenceLanguage } from '../referenceLanguages'
import type { PlaygroundMode } from './types'

export const HASH_LIMIT = 100000
export const CONTENT_STORAGE_KEY = 'lezer-playground-content-v1'

export interface PlaygroundContent {
  mode: PlaygroundMode
  grammar: string
  tokens: string
  highlight: string
  context: string
  sample: string
  referenceSample: string
}

export function loadPersistedContent(): PlaygroundContent | null {
  const fromHash = decodeHash(window.location.hash)
  const fromLocal = readLocal()
  if (fromHash && fromLocal) return mergeSession(fromHash, fromLocal)
  return fromHash ?? fromLocal
}

export function persistContent(content: PlaygroundContent): { hashWritten: boolean } {
  try {
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(localPayload(content)))
  } catch {
    // quota exceeded / private mode — still try to keep the share hash in sync
  }
  const encoded = encodeShare(content)
  if (encoded.length > HASH_LIMIT) {
    const url = new URL(window.location.href)
    history.replaceState(null, '', url.pathname + url.search)
    return { hashWritten: false }
  }
  history.replaceState(null, '', `#${encoded}`)
  return { hashWritten: true }
}

export function shareUrlFor(content: PlaygroundContent): string | null {
  const encoded = encodeShare(content)
  if (encoded.length > HASH_LIMIT) return null
  return `${location.origin}${location.pathname}${location.search}#${encoded}`
}

function encodeShare(content: PlaygroundContent): string {
  if (content.mode.kind === 'reference') {
    return compressToEncodedURIComponent(
      JSON.stringify({
        v: 3,
        mode: {
          kind: 'reference',
          languageId: content.mode.languageId,
          sample: content.referenceSample,
        },
      }),
    )
  }
  return compressToEncodedURIComponent(
    JSON.stringify({
      v: 2,
      grammar: content.grammar,
      tokens: content.tokens,
      highlight: content.highlight,
      context: content.context,
      sample: content.sample,
    }),
  )
}

function localPayload(content: PlaygroundContent) {
  return {
    v: 3,
    mode:
      content.mode.kind === 'reference'
        ? { kind: 'reference', languageId: content.mode.languageId }
        : { kind: 'custom' },
    grammar: content.grammar,
    tokens: content.tokens,
    highlight: content.highlight,
    context: content.context,
    sample: content.sample,
    referenceSample: content.referenceSample,
  }
}

function decodeHash(hash: string): PlaygroundContent | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const json = decompressFromEncodedURIComponent(raw)
  if (!json) return null
  try {
    return normalizePayload(JSON.parse(json))
  } catch {
    return null
  }
}

function readLocal(): PlaygroundContent | null {
  try {
    const raw = localStorage.getItem(CONTENT_STORAGE_KEY)
    if (!raw) return null
    return normalizePayload(JSON.parse(raw))
  } catch {
    return null
  }
}

function mergeSession(hash: PlaygroundContent, local: PlaygroundContent): PlaygroundContent {
  if (hash.mode.kind === 'reference') {
    return {
      ...hash,
      grammar: local.grammar || hash.grammar,
      tokens: local.tokens || hash.tokens,
      highlight: local.highlight || hash.highlight,
      context: local.context || hash.context,
      sample: local.sample || hash.sample,
    }
  }
  return { ...hash, referenceSample: hash.referenceSample || local.referenceSample }
}

function normalizePayload(data: unknown): PlaygroundContent | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const mode = o.mode && typeof o.mode === 'object' ? (o.mode as Record<string, unknown>) : null
  if (mode?.kind === 'reference' && typeof mode.languageId === 'string') {
    if (!getReferenceLanguage(mode.languageId)) return null
    const custom = customFields(o)
    return {
      mode: { kind: 'reference', languageId: mode.languageId },
      grammar: custom?.grammar ?? '',
      tokens: custom?.tokens ?? '',
      highlight: custom?.highlight ?? '',
      context: custom?.context ?? '',
      sample: custom?.sample ?? '',
      referenceSample:
        typeof mode.sample === 'string'
          ? mode.sample
          : typeof o.referenceSample === 'string'
            ? o.referenceSample
            : '',
    }
  }
  const custom = customFields(o)
  if (!custom) return null
  return {
    mode: { kind: 'custom' },
    ...custom,
    referenceSample: typeof o.referenceSample === 'string' ? o.referenceSample : '',
  }
}

function customFields(o: Record<string, unknown>) {
  if (typeof o.grammar !== 'string' || typeof o.sample !== 'string') return null
  if (typeof o.tokens === 'string' || typeof o.highlight === 'string' || typeof o.context === 'string') {
    return {
      grammar: o.grammar,
      tokens: typeof o.tokens === 'string' ? o.tokens : '',
      highlight: typeof o.highlight === 'string' ? o.highlight : '',
      context: typeof o.context === 'string' ? o.context : '',
      sample: o.sample,
    }
  }
  if (typeof o.external === 'string') {
    return { grammar: o.grammar, tokens: o.external, highlight: '', context: '', sample: o.sample }
  }
  return null
}
