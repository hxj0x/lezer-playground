import { compile } from '../playground/actions'
import { useSourceStore } from '../playground/sourceStore'

export function RestoreBanner() {
  const awaitingCompile = useSourceStore((s) => s.awaitingCompile)
  const mode = useSourceStore((s) => s.mode)
  if (!awaitingCompile || mode.kind === 'reference') return null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-panel-alt px-4 py-2">
      <p className="min-w-0 flex-1 text-[12px] text-muted">
        This session was restored from a share link or local storage. Compile to run the grammar
        and any External JS it contains.
      </p>
      <button
        type="button"
        onClick={() => void compile()}
        className="rounded-md bg-brass px-3 py-1 text-[12px] font-semibold text-on-brass hover:brightness-110"
      >
        Compile & Parse
      </button>
    </div>
  )
}
