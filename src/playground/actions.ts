import { LanguageSupport, LRLanguage } from '@codemirror/language'
import type { LRParser } from '@lezer/lr'
import { findByLine, findBySrc, treeToAstText, type AstIndexEntry } from '../ast/treeToAstText'
import { compileGrammar } from '../compiler'
import { examples } from '../examples'
import { getReferenceLanguage, referenceSampleFor } from '../referenceLanguages'
import { useCompileStore } from './compileStore'
import { diagnosticFromLine, diagnosticFromMessage } from './diagnostics'
import { joinExternal } from './externalSource'
import { useSourceStore } from './sourceStore'
import { useSyncStore } from './syncStore'
import type { EditorDiagnostic, HoverSource, StatusKind, SyncRange } from './types'

// Official parsers are a parallel source. compileStore.parser stays the
// custom compile result so switching back does not need to recompile.
export function activeParser(): LRParser | null {
  const { mode } = useSourceStore.getState()
  if (mode.kind === 'reference') return getReferenceLanguage(mode.languageId)?.parser ?? null
  return useCompileStore.getState().parser
}

export function activeSample(): string {
  const { mode, sample, referenceSample } = useSourceStore.getState()
  return mode.kind === 'reference' ? referenceSample : sample
}

export function hasParser(): boolean {
  return activeParser() != null
}

export function noteSourceSeen(grammar: string, external: string) {
  useCompileStore.setState({ lastSeenGrammar: grammar, lastSeenExternal: external })
}

export function sourceChangedSinceSeen(grammar: string, external: string): boolean {
  const { lastSeenGrammar, lastSeenExternal } = useCompileStore.getState()
  return lastSeenGrammar !== grammar || lastSeenExternal !== external
}

function rangeFromEntry(entry: AstIndexEntry, source: HoverSource): SyncRange {
  return {
    srcFrom: entry.srcFrom,
    srcTo: entry.srcTo,
    lineFrom: entry.lineFrom,
    lineTo: entry.lineTo,
    source,
  }
}

function parseStatus(hasError: boolean): { statusText: string; statusKind: StatusKind } {
  const { mode } = useSourceStore.getState()
  if (mode.kind === 'reference') {
    const name = getReferenceLanguage(mode.languageId)?.packageName ?? 'official parser'
    return {
      statusText: hasError
        ? `Parsed with ${name}, but sample has syntax errors (red nodes in the AST)`
        : `Parsed with ${name}`,
      statusKind: hasError ? 'err' : 'ok',
    }
  }
  return {
    statusText: hasError
      ? 'Compiled, but sample input has syntax errors (red nodes in the AST)'
      : 'Compiled and parsed',
    statusKind: hasError ? 'err' : 'ok',
  }
}

function applyParse(current: LRParser, doc: string, extraWarnings: string[], grammarText: string) {
  const reference = useSourceStore.getState().mode.kind === 'reference'
  try {
    const tree = current.parse(doc)
    const { text, index } = treeToAstText(tree)
    const hasError = index.some((entry) => entry.isError)
    useCompileStore.setState({
      astText: text,
      astIndex: index,
      error: null,
      ...parseStatus(hasError),
      ...(reference
        ? {}
        : {
            warnings: extraWarnings,
            grammarDiagnostics: extraWarnings.map((message) =>
              diagnosticFromMessage(message, grammarText, 'warning'),
            ),
            externalDiagnostics: [],
          }),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    useCompileStore.setState({
      astText: '',
      astIndex: [],
      error: message,
      statusText: 'Failed to parse sample input',
      statusKind: 'err',
    })
  }
}

function bindLanguage(parser: LRParser) {
  try {
    const lang = LRLanguage.define({ parser })
    useCompileStore.setState({
      languageSupport: new LanguageSupport(lang),
      liveHighlight: true,
    })
  } catch {
    useCompileStore.setState({
      languageSupport: null,
      liveHighlight: false,
    })
  }
}

export function activateCurrentParser() {
  const parser = activeParser()
  useSyncStore.getState().clear()
  if (!parser) {
    useCompileStore.setState({
      languageSupport: null,
      liveHighlight: false,
      astText: '',
      astIndex: [],
      statusText: 'Not compiled yet',
      statusKind: '',
    })
    return
  }
  bindLanguage(parser)
  const { mode, grammar } = useSourceStore.getState()
  const warnings = mode.kind === 'reference' ? [] : useCompileStore.getState().warnings
  applyParse(parser, activeSample(), warnings, grammar)
}

export function selectMode(value: string) {
  if (value === 'custom') {
    useSourceStore.setState({ mode: { kind: 'custom' } })
    // Restored share/local content must not compile External JS until the user confirms.
    if (useSourceStore.getState().awaitingCompile) {
      activateCurrentParser()
      return
    }
    if (useCompileStore.getState().parser) {
      activateCurrentParser()
      return
    }
    if (useCompileStore.getState().autoCompile) {
      void compile()
      return
    }
    activateCurrentParser()
    return
  }
  const lang = getReferenceLanguage(value)
  if (!lang) return
  useSourceStore.setState({
    mode: { kind: 'reference', languageId: value },
    referenceSample: referenceSampleFor(value, useSourceStore.getState().referenceSample),
  })
  activateCurrentParser()
}

function failureDiagnostics(
  message: string,
  source: 'grammar' | 'external',
  grammarText: string,
  externalText: string,
  line?: number,
  ch?: number,
): { grammarDiagnostics: EditorDiagnostic[]; externalDiagnostics: EditorDiagnostic[] } {
  if (source === 'external') {
    const diagnostic =
      line != null
        ? diagnosticFromLine(message, externalText, line, ch ?? 0, 'error')
        : diagnosticFromMessage(message, externalText, 'error')
    return { grammarDiagnostics: [], externalDiagnostics: [diagnostic] }
  }
  return {
    grammarDiagnostics: [diagnosticFromMessage(message, grammarText, 'error')],
    externalDiagnostics: [],
  }
}

export async function compile() {
  if (useSourceStore.getState().mode.kind === 'reference') {
    activateCurrentParser()
    return
  }
  const my = useCompileStore.getState().compileGen + 1
  useSourceStore.setState({ awaitingCompile: false })
  useCompileStore.setState({ compileGen: my, compiling: true, statusText: 'Compiling…', statusKind: '' })
  const { grammar, tokens, highlight, context, sample } = useSourceStore.getState()
  const externalText = joinExternal(tokens, highlight, context).code
  const result = await compileGrammar(grammar, externalText)
  if (my !== useCompileStore.getState().compileGen) return

  useSyncStore.getState().clear()

  if (!result.ok) {
    const diags = failureDiagnostics(
      result.error,
      result.source,
      grammar,
      externalText,
      result.line,
      result.ch,
    )
    useCompileStore.setState({
      parser: null,
      languageSupport: null,
      liveHighlight: false,
      astText: '',
      astIndex: [],
      warnings: [],
      error: result.error,
      statusText: 'Compile failed',
      statusKind: 'err',
      compiling: false,
      ...diags,
    })
    return
  }

  useCompileStore.setState({ parser: result.parser })
  bindLanguage(result.parser)
  applyParse(result.parser, sample, result.warnings, grammar)
  useCompileStore.setState({ compiling: false })
}

export function reparse() {
  const parser = activeParser()
  if (!parser) return
  const { mode, grammar } = useSourceStore.getState()
  const warnings = mode.kind === 'reference' ? [] : useCompileStore.getState().warnings
  applyParse(parser, activeSample(), warnings, grammar)
}

export function loadExample(id: string) {
  const ex = examples.find((item) => item.id === id) ?? examples[0]!
  const externalText = joinExternal(ex.tokens, ex.highlight, ex.context).code
  noteSourceSeen(ex.grammar, externalText)
  useSourceStore.setState({
    mode: { kind: 'custom' },
    exampleId: ex.id,
    grammar: ex.grammar,
    tokens: ex.tokens,
    highlight: ex.highlight,
    context: ex.context,
    sample: ex.sample,
    awaitingCompile: false,
  })
  useSyncStore.getState().clear()
  void compile()
}

export function hoverFromSamplePos(pos: number | null) {
  const { astIndex } = useCompileStore.getState()
  const { setHoverIfChanged } = useSyncStore.getState()
  if (pos == null || astIndex.length === 0) {
    setHoverIfChanged(null)
    return
  }
  const entry = findBySrc(astIndex, pos)
  setHoverIfChanged(entry ? rangeFromEntry(entry, 'sample') : null)
}

export function hoverFromAstLine(line: number | null) {
  const { astIndex } = useCompileStore.getState()
  const { setHoverIfChanged } = useSyncStore.getState()
  if (line == null || astIndex.length === 0) {
    setHoverIfChanged(null)
    return
  }
  const entry = findByLine(astIndex, line)
  setHoverIfChanged(entry ? rangeFromEntry(entry, 'ast') : null)
}

function locateEntry(entry: AstIndexEntry, source: HoverSource, selectSource: boolean) {
  useSyncStore.setState((prev) => ({
    pinned: rangeFromEntry(entry, source),
    locateNonce: prev.locateNonce + 1,
    selectionRequest: selectSource
      ? { from: entry.srcFrom, to: entry.srcTo, nonce: (prev.selectionRequest?.nonce ?? 0) + 1 }
      : prev.selectionRequest,
  }))
}

export function pinFromSamplePos(pos: number) {
  const entry = findBySrc(useCompileStore.getState().astIndex, pos)
  if (entry) locateEntry(entry, 'sample', false)
}

export function pinFromAstLine(line: number) {
  const entry = findByLine(useCompileStore.getState().astIndex, line)
  if (entry) locateEntry(entry, 'ast', true)
}
