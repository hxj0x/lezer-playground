import type { ReactNode } from 'react'

interface PanelProps {
  title?: string
  badge?: ReactNode
  actions?: ReactNode
  header?: ReactNode
  children: ReactNode
}

export function Panel({ title, badge, actions, header, children }: PanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel-alt px-3 py-1.5">
        {header ?? (
          <>
            <span className="font-mono text-[11px] tracking-wide text-muted uppercase">{title}</span>
            {badge}
          </>
        )}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
