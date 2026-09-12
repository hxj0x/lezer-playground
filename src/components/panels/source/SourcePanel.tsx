import { useState } from 'react'
import { Panel } from '../../Panel'
import { TabBar } from '../../TabBar'
import { ExternalPanel } from '../external/ExternalPanel'
import { GrammarPanel } from '../grammar/GrammarPanel'

const SOURCE_TABS = [
  { id: 'grammar', label: 'grammar' },
  { id: 'external', label: 'external' },
] as const

type SourceTab = (typeof SOURCE_TABS)[number]['id']

export function SourcePanel() {
  const [tab, setTab] = useState<SourceTab>('grammar')

  return (
    <Panel header={<TabBar items={[...SOURCE_TABS]} value={tab} onChange={setTab} uppercase />}>
      <div className={tab === 'grammar' ? 'h-full' : 'hidden'}>
        <GrammarPanel />
      </div>
      <div className={tab === 'external' ? 'h-full' : 'hidden'}>
        <ExternalPanel />
      </div>
    </Panel>
  )
}
