import { useMemo, type ReactNode } from 'react'
import { AstEditor } from '../../../ast/AstEditor'
import { lineSpan } from '../../../ast/treeToAstText'
import { hoverFromAstLine, pinFromAstLine } from '../../../playground/actions'
import { useCompileStore } from '../../../playground/compileStore'
import { useSyncStore } from '../../../playground/syncStore'
import { Panel } from '../../Panel'

export function AstPanel() {
  const astText = useCompileStore((s) => s.astText)
  const astIndex = useCompileStore((s) => s.astIndex)
  const compiling = useCompileStore((s) => s.compiling)
  const error = useCompileStore((s) => s.error)
  const hover = useSyncStore((s) => s.hover)
  const pinned = useSyncStore((s) => s.pinned)
  const locateNonce = useSyncStore((s) => s.locateNonce)
  const active = hover ?? pinned
  const highlightRange = active ? lineSpan(astText, active.lineFrom, active.lineTo) : null
  const errorLines = useMemo(
    () => astIndex.filter((entry) => entry.isError).map((entry) => entry.lineFrom),
    [astIndex],
  )

  return (
    <Panel
      title="AST"
      badge={
        astIndex.length > 0 ? (
          <span className="font-mono text-[11px] text-muted">{astIndex.length} nodes</span>
        ) : null
      }
    >
      {astText ? (
        <AstEditor
          doc={astText}
          highlightRange={highlightRange}
          pinnedLine={pinned?.lineFrom ?? null}
          errorLines={errorLines}
          locateNonce={locateNonce}
          onHoverLine={hoverFromAstLine}
          onClickLine={pinFromAstLine}
        />
      ) : (
        <div className="h-full overflow-auto p-3">
          {compiling ? <EmptyHint>Compiling…</EmptyHint> : null}
          {error && !compiling ? <EmptyHint>Compile failed</EmptyHint> : null}
          {!compiling && !error ? <EmptyHint>Not compiled yet</EmptyHint> : null}
        </div>
      )}
    </Panel>
  )
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}
