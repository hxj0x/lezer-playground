import { create } from 'zustand'
import type { SelectionRequest, SyncRange } from './types'

function sameRange(a: SyncRange | null, b: SyncRange | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.srcFrom === b.srcFrom &&
    a.srcTo === b.srcTo &&
    a.lineFrom === b.lineFrom &&
    a.lineTo === b.lineTo &&
    a.source === b.source
  )
}

export interface SyncState {
  hover: SyncRange | null
  pinned: SyncRange | null
  selectionRequest: SelectionRequest | null
  locateNonce: number
  setHoverIfChanged: (next: SyncRange | null) => void
  clear: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  hover: null,
  pinned: null,
  selectionRequest: null,
  locateNonce: 0,
  setHoverIfChanged: (next) => {
    if (sameRange(get().hover, next)) return
    set({ hover: next })
  },
  clear: () => set({ hover: null, pinned: null }),
}))
