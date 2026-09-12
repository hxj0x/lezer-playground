import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import {
  Group,
  Panel as Split,
  Separator,
  useDefaultLayout,
  useGroupRef,
} from 'react-resizable-panels'
import { useSourceStore } from '../playground/sourceStore'
import { AstPanel } from './panels/ast/AstPanel'
import { SamplePanel } from './panels/sample/SamplePanel'
import { SourcePanel } from './panels/source/SourcePanel'
import { ReferenceHint } from './ReferenceHint'

const OLD_GRID_KEY = 'lezer-playground-layout-v2'
const MAIN_ID = 'lezer-playground-split-main'
const SIDE_ID = 'lezer-playground-split-side'
const STACK_ID = 'lezer-playground-split-stack'
const REF_WIDE_ID = 'lezer-playground-split-ref-wide'
const REF_STACK_ID = 'lezer-playground-split-ref-stack'

const DEFAULT_MAIN = { source: 40, result: 60 }
const DEFAULT_SIDE = { sample: 50, ast: 50 }
const DEFAULT_STACK = { source: 34, sample: 33, ast: 33 }
const DEFAULT_REF = { sample: 50, ast: 50 }
const FILL = 'min-h-0 min-w-0 [&>*]:min-h-0 [&>*]:flex-1'

export interface WorkspaceHandle {
  resetLayout: () => void
}

export const Workspace = forwardRef<WorkspaceHandle>(function Workspace(_props, ref) {
  const mode = useSourceStore((s) => s.mode)
  const mainRef = useGroupRef()
  const sideRef = useGroupRef()
  const stackRef = useGroupRef()
  const refWideRef = useGroupRef()
  const refStackRef = useGroupRef()
  const narrow = useNarrow()

  const mainLayout = useDefaultLayout({ id: MAIN_ID, panelIds: ['source', 'result'] })
  const sideLayout = useDefaultLayout({ id: SIDE_ID, panelIds: ['sample', 'ast'] })
  const stackLayout = useDefaultLayout({ id: STACK_ID, panelIds: ['source', 'sample', 'ast'] })
  const refWideLayout = useDefaultLayout({ id: REF_WIDE_ID, panelIds: ['sample', 'ast'] })
  const refStackLayout = useDefaultLayout({ id: REF_STACK_ID, panelIds: ['sample', 'ast'] })

  useEffect(() => {
    localStorage.removeItem(OLD_GRID_KEY)
  }, [])

  useImperativeHandle(ref, () => ({
    resetLayout() {
      mainRef.current?.setLayout(DEFAULT_MAIN)
      sideRef.current?.setLayout(DEFAULT_SIDE)
      stackRef.current?.setLayout(DEFAULT_STACK)
      refWideRef.current?.setLayout(DEFAULT_REF)
      refStackRef.current?.setLayout(DEFAULT_REF)
    },
  }))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      {mode.kind === 'reference' ? <ReferenceHint languageId={mode.languageId} /> : null}
      {mode.kind === 'reference' ? (
        <Group
          id={narrow ? REF_STACK_ID : REF_WIDE_ID}
          orientation={narrow ? 'vertical' : 'horizontal'}
          className="min-h-0 flex-1"
          defaultLayout={narrow ? refStackLayout.defaultLayout : refWideLayout.defaultLayout}
          onLayoutChanged={narrow ? refStackLayout.onLayoutChanged : refWideLayout.onLayoutChanged}
          groupRef={narrow ? refStackRef : refWideRef}
        >
          <Split id="sample" defaultSize="50%" minSize="20%" className={FILL}>
            <SamplePanel />
          </Split>
          <Separator />
          <Split id="ast" defaultSize="50%" minSize="20%" className={FILL}>
            <AstPanel />
          </Split>
        </Group>
      ) : narrow ? (
        <Group
          id={STACK_ID}
          orientation="vertical"
          className="min-h-0 flex-1"
          defaultLayout={stackLayout.defaultLayout}
          onLayoutChanged={stackLayout.onLayoutChanged}
          groupRef={stackRef}
        >
          <Split id="source" defaultSize="34%" minSize="18%" className={FILL}>
            <SourcePanel />
          </Split>
          <Separator />
          <Split id="sample" defaultSize="33%" minSize="18%" className={FILL}>
            <SamplePanel />
          </Split>
          <Separator />
          <Split id="ast" defaultSize="33%" minSize="18%" className={FILL}>
            <AstPanel />
          </Split>
        </Group>
      ) : (
        <Group
          id={MAIN_ID}
          orientation="horizontal"
          className="min-h-0 flex-1"
          defaultLayout={mainLayout.defaultLayout}
          onLayoutChanged={mainLayout.onLayoutChanged}
          groupRef={mainRef}
        >
          <Split id="source" defaultSize="40%" minSize="20%" className={FILL}>
            <SourcePanel />
          </Split>
          <Separator />
          <Split id="result" defaultSize="60%" minSize="30%" className={FILL}>
            <Group
              id={SIDE_ID}
              orientation="vertical"
              defaultLayout={sideLayout.defaultLayout}
              onLayoutChanged={sideLayout.onLayoutChanged}
              groupRef={sideRef}
            >
              <Split id="sample" defaultSize="50%" minSize="20%" className={FILL}>
                <SamplePanel />
              </Split>
              <Separator />
              <Split id="ast" defaultSize="50%" minSize="20%" className={FILL}>
                <AstPanel />
              </Split>
            </Group>
          </Split>
        </Group>
      )}
    </div>
  )
})

function useNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 768px)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)')
    const onChange = () => setNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return narrow
}
