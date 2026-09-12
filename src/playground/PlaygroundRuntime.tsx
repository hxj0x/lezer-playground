import { useEffect } from 'react'
import { playgroundTitle } from '../examples'
import { getReferenceLanguage } from '../referenceLanguages'
import { activateCurrentParser, compile, hasParser, noteSourceSeen, reparse, sourceChangedSinceSeen } from './actions'
import { useCompileStore } from './compileStore'
import { joinExternal } from './externalSource'
import { persistContent } from './persist'
import { useSourceStore } from './sourceStore'

// Compile walks External JS; reparse only runs the current parser; persist is cheap I/O.
const COMPILE_DEBOUNCE_MS = 420
const REPARSE_DEBOUNCE_MS = 140
const PERSIST_DEBOUNCE_MS = 300

export function PlaygroundRuntime() {
  const mode = useSourceStore((s) => s.mode)
  const grammar = useSourceStore((s) => s.grammar)
  const tokens = useSourceStore((s) => s.tokens)
  const highlight = useSourceStore((s) => s.highlight)
  const context = useSourceStore((s) => s.context)
  const sample = useSourceStore((s) => s.sample)
  const referenceSample = useSourceStore((s) => s.referenceSample)
  const exampleId = useSourceStore((s) => s.exampleId)
  const awaitingCompile = useSourceStore((s) => s.awaitingCompile)
  const autoCompile = useCompileStore((s) => s.autoCompile)
  const activeSample = mode.kind === 'reference' ? referenceSample : sample

  useEffect(() => {
    if (mode.kind === 'reference') {
      const lang = getReferenceLanguage(mode.languageId)
      document.title = lang ? `Lezer Playground · ${lang.label}` : 'Lezer Playground'
      return
    }
    document.title = playgroundTitle(exampleId, grammar)
  }, [exampleId, grammar, mode])

  useEffect(() => {
    if (useSourceStore.getState().awaitingCompile) return
    if (useSourceStore.getState().mode.kind === 'reference') {
      activateCurrentParser()
      return
    }
    void compile()
  }, [])

  useEffect(() => {
    if (mode.kind === 'reference') return
    const external = joinExternal(tokens, highlight, context).code
    const changed = sourceChangedSinceSeen(grammar, external)
    noteSourceSeen(grammar, external)
    if (awaitingCompile || !changed || !autoCompile) return
    const timer = window.setTimeout(() => {
      void compile()
    }, COMPILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [grammar, tokens, highlight, context, autoCompile, awaitingCompile, mode.kind])

  useEffect(() => {
    if (mode.kind === 'custom' && !autoCompile) return
    if (!hasParser()) return
    const timer = window.setTimeout(() => {
      reparse()
    }, REPARSE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [activeSample, autoCompile, mode])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = persistContent({
        mode,
        grammar,
        tokens,
        highlight,
        context,
        sample,
        referenceSample,
      })
      useSourceStore.setState({ shareBlocked: !result.hashWritten })
    }, PERSIST_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [grammar, tokens, highlight, context, sample, mode, referenceSample])

  return null
}
