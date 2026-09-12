import { useEffect, useRef } from 'react'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { rangeHighlightField, setRangeHighlight, type TextRange } from '../cmSetup'

interface HostOptions {
  doc: string
  highlightRange?: TextRange | null
  createExtensions: () => Extension[]
  onHoverPos?: (pos: number | null, view: EditorView) => void
  onClickPos?: (pos: number, view: EditorView) => void
}

/** Create an EditorView once, keep it measured, and sync doc + hover range. */
export function useCodeMirrorHost({
  doc,
  highlightRange = null,
  createExtensions,
  onHoverPos,
  onClickPos,
}: HostOptions) {
  const parentRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onHoverRef = useRef(onHoverPos)
  const onClickRef = useRef(onClickPos)

  useEffect(() => {
    onHoverRef.current = onHoverPos
    onClickRef.current = onClickPos
  }, [onHoverPos, onClickPos])

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc,
        extensions: [
          ...createExtensions(),
          rangeHighlightField,
          EditorView.domEventHandlers({
            mousemove(event, current) {
              const pos = current.posAtCoords({ x: event.clientX, y: event.clientY })
              onHoverRef.current?.(pos ?? null, current)
              return false
            },
            mouseleave() {
              onHoverRef.current?.(null, view)
              return false
            },
            click(event, current) {
              const pos = current.posAtCoords({ x: event.clientX, y: event.clientY })
              if (pos != null) onClickRef.current?.(pos, current)
              return false
            },
          }),
        ],
      }),
    })
    viewRef.current = view

    const ro = new ResizeObserver(() => view.requestMeasure())
    ro.observe(parent)

    return () => {
      ro.disconnect()
      view.destroy()
      viewRef.current = null
    }
    // Created once; doc/highlight sync through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === doc) return
    view.dispatch({ changes: { from: 0, to: current.length, insert: doc } })
  }, [doc])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const len = view.state.doc.length
    let next: TextRange | null = null
    if (highlightRange) {
      const from = Math.max(0, Math.min(highlightRange.from, len))
      const to = Math.max(from, Math.min(highlightRange.to, len))
      if (from < to) next = { from, to }
    }
    view.dispatch({ effects: setRangeHighlight.of(next) })
  }, [highlightRange])

  return { parentRef, viewRef }
}
