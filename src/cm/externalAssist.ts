import { autocompletion, completeFromList } from '@codemirror/autocomplete'
import { hoverTooltip } from '@codemirror/view'
import { PRELUDE_NAMES } from '../compiler'

const INFO: Record<string, string> = {
  ExternalTokenizer: 'new ExternalTokenizer((input) => { ... }, options?)',
  ContextTracker: 'new ContextTracker({ start, hash?, shift?, reduce?, reuse? })',
  Stack: 'Parse stack passed into tokenizer / context callbacks.',
  InputStream: 'input.next / input.peek(n) / input.acceptToken(id, skip?)',
  LRParser: 'Compile result. You rarely need to construct this yourself.',
  NodeProp: 'Extra data on a node. propSource usually uses styleTags.',
  NodeType: 'Description of a node type.',
  NodeSet: 'A set of NodeType values.',
  Tree: 'Syntax tree.',
  TreeFragment: 'Tree fragment used for incremental parse.',
  styleTags: 'styleTags({ NodeName: tags.keyword })',
  tags: 'tags.keyword / tags.variableName / tags.number / ...',
  tagHighlighter: 'Highlight a tree with a custom tag map.',
  highlightTree: 'Run highlighting over a Tree.',
  Tag: 'A highlight tag such as tags.keyword.',
}

export const externalCompletion = autocompletion({
  override: [
    completeFromList(
      PRELUDE_NAMES.map((label) => ({
        label,
        type: 'variable',
        detail: 'playground prelude',
        info: INFO[label] ?? label,
      })),
    ),
  ],
})

export const externalHover = hoverTooltip((view, pos) => {
  const word = view.state.wordAt(pos)
  if (!word) return null
  const text = view.state.doc.sliceString(word.from, word.to)
  const info = INFO[text]
  if (!info) return null
  return {
    pos: word.from,
    end: word.to,
    create() {
      const dom = document.createElement('div')
      dom.className = 'cm-assist-tooltip'
      dom.textContent = info
      return { dom }
    },
  }
})
