/**
 * @dsh-external/dsh-chat-tools — client half.
 *
 * Adds to the DeepSeek Harness web UI:
 * - a per-turn collapse/expand control (Zhihu-style);
 * - a session-header selection mode with select-all and clear;
 * - Markdown / TXT export of the selected conversation turns.
 *
 * It uses the standard DSH client slot system:
 *   conversation.session.header.utilities    -> header toolbar
 *   conversation.chat.assistant-actions      -> per-turn collapse + checkbox
 */
import { createChatToolsController, createChatToolsStore } from './store'
import { HeaderToolbar, AssistantActionToolbar } from './components'

export const inject = ['slots', 'sessions', 'locale']

const NS = 'dsh-chat-tools'

const zh = {
  select: '选择',
  cancel: '取消',
  selectAll: '全选',
  clear: '清空',
  exportMd: '导出 Markdown',
  exportTxt: '导出 TXT',
  selected: '已选 {count} 组',
  collapse: '折叠回复',
  expand: '展开回复',
  collapseAll: '折叠全部',
  expandAll: '展开全部',
  collapsedHint: 'AI 回复已折叠',
  selectTurn: '选择第 {turn} 轮对话',
}

const en = {
  select: 'Select',
  cancel: 'Cancel',
  selectAll: 'Select all',
  clear: 'Clear',
  exportMd: 'Export Markdown',
  exportTxt: 'Export TXT',
  selected: '{count} selected',
  collapse: 'Collapse',
  expand: 'Expand',
  collapseAll: 'Collapse all',
  expandAll: 'Expand all',
  collapsedHint: 'AI reply collapsed',
  selectTurn: 'Select turn {turn}',
}

const STYLE_ID = 'dsh-chat-tools-styles'
const STYLE_CSS = `
.${'dsh-chat-tools-header'} {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.${'dsh-chat-tools-turn'} {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
.${'dsh-chat-tools-btn'} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));
  border-radius: 13px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}
.${'dsh-chat-tools-btn'}:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12));
}
.${'dsh-chat-tools-btn'}:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.${'dsh-chat-tools-btn-primary'} {
  border-color: var(--dsw-alias-state-business-primary, #4f8cff);
  color: var(--dsw-alias-state-business-primary, #4f8cff);
}
.${'dsh-chat-tools-summary'} {
  color: var(--dsw-alias-label-tertiary, inherit);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}
.${'dsh-chat-tools-checkbox'} {
  width: 14px;
  height: 14px;
  accent-color: var(--dsw-alias-state-business-primary, #4f8cff);
  cursor: pointer;
}
/* When the right sidebar is open, keep the chat scrollbar clear of the
   sidebar resize handle by reserving a transparent right border. The handle
   itself is left untouched, so the scrollbar stays on the left side of the
   border and remains draggable. */
body:not([data-dsh-sidebar-collapsed]) [data-conversation-scroll] {
  border-right: var(--dsh-scrollbar-width, 8px) solid transparent !important;
}
`

function injectStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)
  if (!style) {
    style = document.createElement('style')
    style.dataset.pluginCss = STYLE_ID
    document.head.appendChild(style)
  }
  // Always refresh the content so hot reloads pick up CSS changes.
  style.textContent = STYLE_CSS
}

export function apply(ctx: any): void {
  const store = createChatToolsStore()
  const controller = createChatToolsController(store)

  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'dsh-chat-tools: locale dictionaries',
  )
  const t = ctx.locale.bind(NS)
  injectStyles()

  // Header toolbar: selection mode + export.
  ctx.slots.inject('conversation.session.header.utilities', () =>
    ctx.slots.register(
      {
        name: 'conversation.session.header.utilities',
        id: 'dsh-chat-tools-header',
        order: 120,
        locale: NS,
        inject: (sessionId: string) => ({
          hooks: { chatTools: store },
          sessionId,
          chatTools: controller,
          t,
        }),
      },
      HeaderToolbar,
    ),
  )

  // Per-turn collapse + selection checkbox.
  // `conversation.chat.assistant-actions` is a list slot, so this coexists
  // with other plugins (unlike the chain slot `conversation.chat.turnTail`,
  // where only one plugin can render per turn).
  ctx.slots.inject('conversation.chat.assistant-actions', () =>
    ctx.slots.register(
      {
        name: 'conversation.chat.assistant-actions',
        id: 'dsh-chat-tools-turn',
        order: 120,
        locale: NS,
        inject: (sessionId: string) => ({
          hooks: { chatTools: store },
          sessionId,
          chatTools: controller,
          t,
        }),
      },
      AssistantActionToolbar,
    ),
  )
}
