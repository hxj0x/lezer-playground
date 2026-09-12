import { useMemo } from 'react'
import { hoverFromSamplePos, pinFromSamplePos } from '../../../playground/actions'
import { useCompileStore } from '../../../playground/compileStore'
import { useSourceStore } from '../../../playground/sourceStore'
import { useSyncStore } from '../../../playground/syncStore'
import { CodeEditor } from '../../CodeEditor'
import { Panel } from '../../Panel'

export function SamplePanel() {
  const sample = useSourceStore((s) => (s.mode.kind === 'reference' ? s.referenceSample : s.sample))
  const setSample = useSourceStore((s) =>
    s.mode.kind === 'reference' ? s.setReferenceSample : s.setSample,
  )
  const languageSupport = useCompileStore((s) => s.languageSupport)
  const liveHighlight = useCompileStore((s) => s.liveHighlight)
  const hover = useSyncStore((s) => s.hover)
  const pinned = useSyncStore((s) => s.pinned)
  const selectionRequest = useSyncStore((s) => s.selectionRequest)
  const active = hover ?? pinned
  const extensions = useMemo(() => (languageSupport ? [languageSupport] : []), [languageSupport])
  const highlightRange = active ? { from: active.srcFrom, to: active.srcTo } : null

  return (
    <Panel
      title="sample input"
      badge={
        liveHighlight ? <span className="font-mono text-[11px] text-teal">live highlight</span> : null
      }
    >
      <CodeEditor
        doc={sample}
        onChange={setSample}
        extensions={extensions}
        highlightRange={highlightRange}
        onHoverPos={hoverFromSamplePos}
        onClickPos={pinFromSamplePos}
        selection={selectionRequest}
      />
    </Panel>
  )
}
