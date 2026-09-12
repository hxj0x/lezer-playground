import { useMemo, useState } from 'react'
import { javascript } from '@codemirror/lang-javascript'
import { externalCompletion, externalHover } from '../../../cm/externalAssist'
import { useCompileStore } from '../../../playground/compileStore'
import { diagnosticsForTab } from '../../../playground/externalSource'
import { useSourceStore } from '../../../playground/sourceStore'
import type { ExternalTab } from '../../../playground/types'
import { CodeEditor } from '../../CodeEditor'
import { TabBar } from '../../TabBar'

const JS_EXTS = [javascript(), externalCompletion, externalHover]

const TABS: { id: ExternalTab; label: string }[] = [
  { id: 'tokens', label: 'tokens.js' },
  { id: 'highlight', label: 'highlight.js' },
  { id: 'context', label: 'context.js' },
]

export function ExternalPanel() {
  const [tab, setTab] = useState<ExternalTab>('tokens')
  const tokens = useSourceStore((s) => s.tokens)
  const highlight = useSourceStore((s) => s.highlight)
  const context = useSourceStore((s) => s.context)
  const setTokens = useSourceStore((s) => s.setTokens)
  const setHighlight = useSourceStore((s) => s.setHighlight)
  const setContext = useSourceStore((s) => s.setContext)
  const allDiagnostics = useCompileStore((s) => s.externalDiagnostics)

  const doc = tab === 'tokens' ? tokens : tab === 'highlight' ? highlight : context
  const onChange = tab === 'tokens' ? setTokens : tab === 'highlight' ? setHighlight : setContext
  const diagnostics = useMemo(
    () => diagnosticsForTab(allDiagnostics, tab, tokens, highlight, context),
    [allDiagnostics, tab, tokens, highlight, context],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-line px-1">
        <TabBar items={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor doc={doc} onChange={onChange} extensions={JS_EXTS} diagnostics={diagnostics} />
      </div>
    </div>
  )
}
