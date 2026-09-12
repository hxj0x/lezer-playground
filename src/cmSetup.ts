import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import { LanguageSupport, LRLanguage } from '@codemirror/language'
import { parser as lezerGrammarParser } from '@lezer/lezer'

/** Overlay on top of `oneDark`: blend into the page and keep hover-sync marks. */
export const playgroundTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      height: '100%',
      fontSize: '0.82rem',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      padding: '0.7rem 0.85rem 1.2rem 0',
    },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      border: 'none',
    },
    '.cm-sync-range': {
      background: 'color-mix(in srgb, var(--color-brass) 34%, transparent)',
      borderRadius: '2px',
      boxDecorationBreak: 'clone',
    },
  },
  { dark: true },
)

const lezerGrammarLanguage = LRLanguage.define({ parser: lezerGrammarParser })

export function grammarLanguage(): LanguageSupport {
  return new LanguageSupport(lezerGrammarLanguage)
}

export type TextRange = { from: number; to: number }

export const setRangeHighlight = StateEffect.define<TextRange | null>()

const rangeMark = Decoration.mark({ class: 'cm-sync-range' })

export const rangeHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setRangeHighlight)) {
        if (!e.value || e.value.from >= e.value.to) {
          deco = Decoration.none
        } else {
          deco = Decoration.set([rangeMark.range(e.value.from, e.value.to)])
        }
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})
