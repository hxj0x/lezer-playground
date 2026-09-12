import { HighlightStyle, LanguageSupport, LRLanguage, foldInside, foldNodeProp } from '@codemirror/language'
import { styleTags, tags as t } from '@lezer/highlight'
import { parser } from './ast.grammar'

const astParser = parser.configure({
  props: [
    styleTags({
      Name: t.typeName,
      Range: t.number,
      '{ }': t.brace,
    }),
    foldNodeProp.add({
      Block: foldInside,
    }),
  ],
})

const astLang = LRLanguage.define({ name: 'lezer-ast', parser: astParser })

export function astLanguage(): LanguageSupport {
  return new LanguageSupport(astLang)
}

export const astHighlightStyle = HighlightStyle.define([
  { tag: t.typeName, color: 'var(--color-ink)' },
  { tag: t.number, color: 'var(--color-muted)' },
  { tag: t.brace, color: 'var(--color-teal)' },
  { tag: t.invalid, color: 'var(--color-coral)' },
])
