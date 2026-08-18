/**
 * Chat Tools client store: selection mode, selected turns, and collapsed turns.
 * All state is intentionally small and local to the browser session.
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

export interface ChatToolsState {
  /** Whether multi-select mode is active. */
  mode: boolean
  /** Turn id (as decimal string) -> selected. */
  selected: Record<string, true>
  /** Turn id (as decimal string) -> collapsed. */
  collapsed: Record<string, true>
}

export type ChatToolsStore = SnapshotStore<ChatToolsState>

export interface ChatToolsController {
  toggleMode(): void
  toggleTurn(turn: number): void
  selectAll(turns: number[]): void
  clearSelection(): void
  toggleCollapse(turn: number): void
  collapseAll(turns: number[]): void
  expandAll(): void
}

export function createChatToolsStore(): ChatToolsStore {
  return createSnapshotStore<ChatToolsState>({
    mode: false,
    selected: {},
    collapsed: {},
  })
}

export function createChatToolsController(store: ChatToolsStore): ChatToolsController {
  return {
    toggleMode() {
      store.update((state) => {
        state.mode = !state.mode
        // Leaving selection mode clears the current selection so the UI never
        // exports a stale hidden set next time.
        if (!state.mode) state.selected = {}
      })
    },

    toggleTurn(turn: number) {
      const key = String(turn)
      store.update((state) => {
        if (state.selected[key] === true) delete state.selected[key]
        else state.selected[key] = true
      })
    },

    selectAll(turns: number[]) {
      const next: Record<string, true> = {}
      for (const turn of turns) next[String(turn)] = true
      store.update((state) => {
        state.selected = next
      })
    },

    clearSelection() {
      store.update((state) => {
        state.selected = {}
      })
    },

    toggleCollapse(turn: number) {
      const key = String(turn)
      store.update((state) => {
        if (state.collapsed[key] === true) delete state.collapsed[key]
        else state.collapsed[key] = true
      })
    },

    collapseAll(turns: number[]) {
      const next: Record<string, true> = {}
      for (const turn of turns) next[String(turn)] = true
      store.update((state) => {
        state.collapsed = next
      })
    },

    expandAll() {
      store.update((state) => {
        state.collapsed = {}
      })
    },
  }
}
