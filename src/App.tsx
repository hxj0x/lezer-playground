import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { RestoreBanner } from './components/RestoreBanner'
import { Workspace, type WorkspaceHandle } from './components/Workspace'
import { compile, reparse } from './playground/actions'
import { useSourceStore } from './playground/sourceStore'
import { PlaygroundRuntime } from './playground/PlaygroundRuntime'

function Shell() {
  const workspaceRef = useRef<WorkspaceHandle>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (useSourceStore.getState().mode.kind === 'reference') reparse()
        else void compile()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-ink">
      <Header onResetLayout={() => workspaceRef.current?.resetLayout()} />
      <RestoreBanner />
      <Workspace ref={workspaceRef} />
    </div>
  )
}

export default function App() {
  return (
    <>
      <PlaygroundRuntime />
      <Shell />
    </>
  )
}
