import { autocompletion, completeFromList } from '@codemirror/autocomplete'
import type { EditorState } from '@codemirror/state'
import { hoverTooltip } from '@codemirror/view'

export interface AssistItem {
  label: string
  detail: string
  info: string
}

export const grammarDirectives: AssistItem[] = [
  { label: '@top', detail: 'top rule', info: '@top Name { rule }\nDeclares the grammar entry rule.' },
  { label: '@skip', detail: 'auto-skip', info: '@skip { space | Comment }\nThese tokens are skipped between rules.' },
  { label: '@tokens', detail: 'token block', info: '@tokens { Name { pattern } }\nDeclares lexical tokens.' },
  {
    label: '@external',
    detail: 'external impl',
    info: '@external tokens name from "./file.js" { Token }\n@external propSource name from "./file.js"\nWire tokens, highlighting, or specialize to External JS.',
  },
  { label: '@context', detail: 'context tracker', info: '@context name from "./file.js"\nAttach a ContextTracker.' },
  { label: '@precedence', detail: 'precedence', info: '@precedence { left add, mul }\nOperator precedence and associativity.' },
  { label: '@detectDelim', detail: 'delimiter pairs', info: '@detectDelim\nAdd delimited props for matching open/close tokens.' },
  { label: '@dialects', detail: 'dialects', info: '@dialects { jsx ts }\nDeclare optional dialects.' },
  { label: '@conflict', detail: 'conflict mark', info: '@conflict\nMark a known shift/reduce conflict.' },
  { label: '@specialize', detail: 'specialize', info: '@specialize { keyword }\nSpecialize a generic token into keywords, etc.' },
  { label: '@extend', detail: 'extend', info: '@extend { keyword }\nLike specialize, for an extensible word list.' },
]

export const grammarCompletion = autocompletion({
  override: [
    completeFromList(
      grammarDirectives.map((item) => ({
        label: item.label,
        type: 'keyword',
        detail: item.detail,
        info: item.info,
      })),
    ),
  ],
})

export const grammarHover = hoverTooltip((view, pos) => {
  const hit = directiveAt(view.state, pos)
  if (!hit) return null
  const item = grammarDirectives.find((entry) => entry.label === hit.text)
  if (!item) return null
  return {
    pos: hit.from,
    end: hit.to,
    create() {
      const dom = document.createElement('div')
      dom.className = 'cm-assist-tooltip'
      dom.textContent = item.info
      return { dom }
    },
  }
})

function directiveAt(state: EditorState, pos: number): { from: number; to: number; text: string } | null {
  const line = state.doc.lineAt(pos)
  const re = /@[A-Za-z]+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(line.text))) {
    const from = line.from + match.index
    const to = from + match[0].length
    if (pos >= from && pos <= to) return { from, to, text: match[0] }
  }
  return null
}
