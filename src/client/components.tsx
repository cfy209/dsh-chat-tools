/**
 * Chat Tools UI components.
 *
 * - HeaderToolbar: "选择 / 全选 / 导出" controls in the session header.
 * - AssistantActionToolbar: per-turn collapse button + (in selection mode) a
 *   checkbox, mounted through the list slot `conversation.chat.assistant-actions`
 *   so it coexists with other plugins.
 */
import { memo, useEffect, useRef } from 'react'
import { jsx, Fragment } from 'react/jsx-runtime'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatToolsController, ChatToolsState } from './store'
import { downloadExport } from './export'

type ChatToolsHook = <T>(selector: (state: ChatToolsState) => T) => T

interface HeaderToolbarProps {
  sessionId: string
  useSession: (selector: (snapshot: ConversationSnapshot) => unknown) => unknown
  useChatTools: ChatToolsHook
  chatTools: ChatToolsController
  t: (key: string, params?: Record<string, unknown>) => string
}

interface AssistantActionToolbarProps {
  /** Durable assistant message id supplied by the conversation.chat.assistant-actions slot. */
  messageId: string
  sessionId: string
  useSession: (selector: (snapshot: ConversationSnapshot) => unknown) => unknown
  useChatTools: ChatToolsHook
  chatTools: ChatToolsController
  t: (key: string, params?: Record<string, unknown>) => string
}

const HEADER_CLASS = 'dsh-chat-tools-header'
const TURN_CLASS = 'dsh-chat-tools-turn'
const BTN_CLASS = 'dsh-chat-tools-btn'
const BTN_PRIMARY_CLASS = 'dsh-chat-tools-btn dsh-chat-tools-btn-primary'
const CHECKBOX_CLASS = 'dsh-chat-tools-checkbox'
const SUMMARY_CLASS = 'dsh-chat-tools-summary'

export const HeaderToolbar = memo(function HeaderToolbar(props: HeaderToolbarProps) {
  const { sessionId, useSession, useChatTools, chatTools, t } = props
  const mode = useChatTools((state) => state.mode)
  const selected = useChatTools((state) => state.selected)
  const snapshot = useSession((state) => state) as ConversationSnapshot | null | undefined
  const turnOrder: number[] = snapshot?.chat?.timeline?.turnOrder ?? []
  const closedTurns = turnOrder.filter((turn) => {
    const status = snapshot?.chat?.timeline?.turns?.get?.(turn)?.status
    return status === 'closed'
  })
  const selectedCount = Object.keys(selected).length

  if (!sessionId) return null

  const exportMd = () => downloadExport(snapshot, selected, 'md')
  const exportTxt = () => downloadExport(snapshot, selected, 'txt')

  return (
    <div className={HEADER_CLASS}>
      {!mode ? (
        <Fragment>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.collapseAll(closedTurns)}>
            {t('collapseAll')}
          </button>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.expandAll()}>
            {t('expandAll')}
          </button>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.toggleMode()}>
            {t('select')}
          </button>
        </Fragment>
      ) : (
        <Fragment>
          <span className={SUMMARY_CLASS}>{t('selected', { count: selectedCount })}</span>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.selectAll(closedTurns)}>
            {t('selectAll')}
          </button>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.clearSelection()}>
            {t('clear')}
          </button>
          <button type="button" className={BTN_PRIMARY_CLASS} onClick={exportMd} disabled={selectedCount === 0}>
            {t('exportMd')}
          </button>
          <button type="button" className={BTN_PRIMARY_CLASS} onClick={exportTxt} disabled={selectedCount === 0}>
            {t('exportTxt')}
          </button>
          <button type="button" className={BTN_CLASS} onClick={() => chatTools.toggleMode()}>
            {t('cancel')}
          </button>
        </Fragment>
      )}
    </div>
  )
})

function findTurnByMessageId(
  snapshot: ConversationSnapshot | null | undefined,
  messageId: string,
): number | undefined {
  if (!snapshot) return undefined
  // Prefer the live chat node store (it is the authoritative render source).
  for (const node of snapshot.chat?.nodes?.values?.() ?? []) {
    const data = (node as any)?.data
    if (data?.messageId === messageId && typeof data?.turn === 'number') return data.turn
  }
  // Fallback to the legacy flat node list.
  for (const node of snapshot.nodes ?? []) {
    const data = node as any
    if (data?.messageId === messageId && typeof data?.turn === 'number') return data.turn
  }
  return undefined
}

export const AssistantActionToolbar = memo(function AssistantActionToolbar(props: AssistantActionToolbarProps) {
  const { messageId, sessionId, useSession, useChatTools, chatTools, t } = props
  const rootRef = useRef<HTMLDivElement | null>(null)
  const snapshot = useSession((state) => state) as ConversationSnapshot | null | undefined
  const turnId = findTurnByMessageId(snapshot, messageId)
  const turnKey = turnId === undefined ? '' : String(turnId)
  const mode = useChatTools((state) => state.mode)
  const selected = useChatTools((state) => state.selected)
  const collapsed = useChatTools((state) => turnKey !== '' && state.collapsed[turnKey] === true)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // The slot renders inside the turn-tail container; the rows we need to
    // collapse are siblings of the turn-tail FLOW ROW in the chat list.
    // The flow row is the wrapper carrying `data-chat-flow-kind="turn-tail"`;
    // `[data-turn-tail]` alone is nested one level deeper and has no siblings.
    const turnTailRow = root.closest<HTMLElement>('[data-chat-flow-kind="turn-tail"]')
      ?? root.closest<HTMLElement>('[data-turn-tail]')
    if (!turnTailRow) return
    const list = turnTailRow.parentElement
    if (!list) return

    const apply = () => {
      let current: Element | null = turnTailRow.previousElementSibling
      const rows: HTMLElement[] = []
      while (current && current instanceof HTMLElement) {
        const kind = current.getAttribute('data-chat-flow-kind')
        // Stop at the user message that starts this turn, and also at the
        // previous turn's tail so we never hide rows from another turn.
        if (kind === 'user' || kind === 'steering' || kind === 'context' || kind === 'turn-tail') break
        rows.push(current)
        current = current.previousElementSibling
      }
      for (const row of rows) row.style.display = collapsed ? 'none' : ''
    }

    apply()
    if (!collapsed) return
    const observer = new MutationObserver(apply)
    observer.observe(list, { childList: true })
    return () => observer.disconnect()
  }, [collapsed, turnId])

  if (!sessionId || turnId === undefined) return null

  return (
    <div className={TURN_CLASS} ref={rootRef} data-dsh-chat-tools-turn={turnId}>
      {mode && (
        <input
          type="checkbox"
          className={CHECKBOX_CLASS}
          checked={selected[turnKey] === true}
          onChange={() => chatTools.toggleTurn(turnId)}
          aria-label={t('selectTurn', { turn: turnId })}
        />
      )}
      <button
        type="button"
        className={BTN_CLASS}
        aria-expanded={!collapsed}
        onClick={() => chatTools.toggleCollapse(turnId)}
      >
        {collapsed ? t('expand') : t('collapse')}
      </button>
      {collapsed && <span className={SUMMARY_CLASS}>{t('collapsedHint')}</span>}
    </div>
  )
})
