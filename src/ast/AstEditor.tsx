import { useEffect } from 'react'
import { defaultKeymap } from '@codemirror/commands'
import { foldedRanges, foldGutter, foldKeymap, syntaxHighlighting, unfoldEffect } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { EditorState, StateEffect, StateField } from '@codemirror/state'
import { oneDarkTheme } from '@codemirror/theme-one-dark'
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view'
import { playgroundTheme, type TextRange } from '../cmSetup'
import { useCodeMirrorHost } from '../cm/useCodeMirrorHost'
import { astHighlightStyle, astLanguage } from './astLanguage'
import { astPinGutter, setAstPin } from './pinGutter'

const setErrorLines = StateEffect.define<number[]>()
const errorLineMark = Decoration.line({ class: 'cm-ast-error' })
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const effect of tr.effects) {
      if (!effect.is(setErrorLines)) continue
      deco = Decoration.set(
        effect.value
          .filter((lineFrom) => lineFrom >= 0 && lineFrom < tr.state.doc.lines)
          .map((lineFrom) => errorLineMark.range(tr.state.doc.line(lineFrom + 1).from)),
      )
    }
    return deco
  },
  provide: (field) => EditorView.decorations.from(field),
})

interface AstEditorProps {
  doc: string
  highlightRange?: TextRange | null
  pinnedLine?: number | null
  errorLines?: number[]
  locateNonce?: number
  onHoverLine?: (line: number | null) => void
  onClickLine?: (line: number) => void
}

export function AstEditor({
  doc,
  highlightRange = null,
  pinnedLine = null,
  errorLines = [],
  locateNonce = 0,
  onHoverLine,
  onClickLine,
}: AstEditorProps) {
  const { parentRef, viewRef } = useCodeMirrorHost({
    doc,
    highlightRange,
    createExtensions: () => [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      lineNumbers(),
      foldGutter(),
      astPinGutter,
      highlightSpecialChars(),
      drawSelection(),
      astLanguage(),
      syntaxHighlighting(astHighlightStyle),
      search({ top: true }),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...searchKeymap, ...foldKeymap]),
      oneDarkTheme,
      playgroundTheme,
      errorLineField,
    ],
    onHoverPos: (pos, view) => {
      onHoverLine?.(pos == null ? null : view.state.doc.lineAt(pos).number - 1)
    },
    onClickPos: (pos, view) => {
      onClickLine?.(view.state.doc.lineAt(pos).number - 1)
    },
  })

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setErrorLines.of(errorLines) })
  }, [errorLines, viewRef])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({ effects: setAstPin.of(pinnedLine) })
    if (pinnedLine == null) return
    const line = view.state.doc.line(Math.min(pinnedLine + 1, view.state.doc.lines))
    unfoldCovering(view, line.from)
    view.dispatch({
      selection: { anchor: line.from, head: line.from },
      scrollIntoView: true,
    })
  }, [pinnedLine, locateNonce, viewRef])

  return <div ref={parentRef} className="cm-host h-full min-h-0 overflow-hidden" />
}

function unfoldCovering(view: EditorView, pos: number) {
  const effects: ReturnType<typeof unfoldEffect.of>[] = []
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
    if (pos >= from && pos <= to) effects.push(unfoldEffect.of({ from, to }))
  })
  if (effects.length) view.dispatch({ effects })
}
