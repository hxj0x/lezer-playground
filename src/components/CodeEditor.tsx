import { useEffect, useRef } from 'react'
import { lintGutter, linter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { EditorView, basicSetup } from 'codemirror'
import { Compartment, type Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { playgroundTheme, type TextRange } from '../cmSetup'
import { useCodeMirrorHost } from '../cm/useCodeMirrorHost'
import type { EditorDiagnostic } from '../playground/types'

interface CodeEditorProps {
  doc: string
  onChange: (doc: string) => void
  extensions?: Extension[]
  highlightRange?: TextRange | null
  diagnostics?: EditorDiagnostic[]
  onHoverPos?: (pos: number | null) => void
  onClickPos?: (pos: number) => void
  selection?: { from: number; to: number; nonce: number } | null
}

export function CodeEditor({
  doc,
  onChange,
  extensions = [],
  highlightRange = null,
  diagnostics = [],
  onHoverPos,
  onClickPos,
  selection = null,
}: CodeEditorProps) {
  const extraCompartment = useRef(new Compartment())
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const { parentRef, viewRef } = useCodeMirrorHost({
    doc,
    highlightRange,
    createExtensions: () => [
      basicSetup,
      oneDark,
      playgroundTheme,
      linter(null),
      lintGutter(),
      extraCompartment.current.of(extensions),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current(update.state.doc.toString())
      }),
    ],
    onHoverPos: (pos) => onHoverPos?.(pos),
    onClickPos,
  })

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: extraCompartment.current.reconfigure(extensions) })
  }, [extensions, viewRef])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const len = view.state.doc.length
    const next: Diagnostic[] = diagnostics.map((item) => ({
      from: Math.max(0, Math.min(item.from, len)),
      to: Math.max(0, Math.min(item.to, len)),
      severity: item.severity,
      message: item.message,
    }))
    view.dispatch(setDiagnostics(view.state, next))
  }, [diagnostics, viewRef])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !selection) return
    const len = view.state.doc.length
    const from = Math.max(0, Math.min(selection.from, len))
    const to = Math.max(from, Math.min(selection.to, len))
    view.dispatch({
      selection: { anchor: from, head: to },
      scrollIntoView: true,
    })
    view.focus()
  }, [selection, viewRef])

  return <div ref={parentRef} className="cm-host h-full min-h-0 overflow-hidden" />
}
