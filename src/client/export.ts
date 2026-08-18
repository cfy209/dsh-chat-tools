/**
 * Export selected conversation turns as Markdown or plain text.
 *
 * The data source is the already-loaded client conversation snapshot
 * (`useSession`). Only turns that are currently materialized in the window
 * can be selected/exported, which is exactly the set the user can see.
 */
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

export type ExportFormat = 'md' | 'txt'

interface ExportEntry {
  role: '用户' | 'AI'
  text: string
  time?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function blockText(block: unknown): string {
  if (!isRecord(block)) return ''
  if (typeof block.text === 'string') return block.text
  return ''
}

/** Convert core ContentBlock[] (user messages) to plain text. */
function contentToText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => blockText(block))
    .filter((text) => text.trim() !== '')
    .join('\n')
}

/** Convert AssistantBlock[] (assistant messages) to plain text. */
function assistantBlocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ''
  const lines: string[] = []
  for (const block of blocks) {
    if (!isRecord(block)) continue
    if (block.kind === 'text' && typeof block.text === 'string') {
      if (block.text.trim() !== '') lines.push(block.text)
    } else if (block.kind === 'reasoning' && typeof block.text === 'string') {
      if (block.text.trim() !== '') lines.push(`> ${block.text}`)
    } else if (block.kind === 'tool-call' && typeof block.name === 'string') {
      lines.push(`[工具调用] ${block.name}`)
    }
  }
  return lines.join('\n')
}

/** Resolve one chat node to an export entry, or null for non-message nodes. */
function entryFromNode(node: { kind?: string; data?: unknown }): ExportEntry | null {
  const data = isRecord(node.data) ? node.data : {}
  const kind = node.kind ?? data.kind

  if (kind === 'user' || kind === 'steering') {
    const text = contentToText(data.content)
    return text.trim() === '' ? null : { role: '用户', text }
  }

  if (kind === 'assistant') {
    const text = assistantBlocksToText(data.blocks)
    return text.trim() === '' ? null : { role: 'AI', text, time: typeof data.time === 'number' ? data.time : undefined }
  }

  // Commands, tool results, compaction summaries, turn-tail markers, etc.
  // are intentionally not part of the conversational text export.
  return null
}

function formatTime(time?: number): string {
  if (time === undefined) return ''
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatMarkdown(entries: ExportEntry[]): string {
  const lines: string[] = ['# DSH 对话导出', '']
  for (const entry of entries) {
    lines.push(`## ${entry.role}${entry.time ? ` · ${formatTime(entry.time)}` : ''}`)
    lines.push('')
    lines.push(entry.text)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}

function formatTxt(entries: ExportEntry[]): string {
  const lines: string[] = []
  for (const entry of entries) {
    lines.push('====================')
    lines.push(`${entry.role}${entry.time ? ` (${formatTime(entry.time)})` : ''}`)
    lines.push('====================')
    lines.push('')
    lines.push(entry.text)
    lines.push('')
  }
  return lines.join('\n').trim() + '\n'
}

/**
 * Build the exported text for the selected turns.
 * @param snapshot - current conversation snapshot (from useSession).
 * @param selected - turn id -> true.
 * @param format - md or txt.
 */
export function buildExport(
  snapshot: ConversationSnapshot | null | undefined,
  selected: Record<string, true>,
  format: ExportFormat,
): string {
  const entries: ExportEntry[] = []
  if (!snapshot) return format === 'md' ? formatMarkdown(entries) : formatTxt(entries)

  const chat = snapshot.chat
  const turnOrder: number[] = chat?.timeline?.turnOrder ?? []
  const turnIds = turnOrder.filter((turn) => selected[String(turn)] === true)

  for (const turn of turnIds) {
    const keys = chat.locations.getTurn(turn) ?? []
    for (const key of keys) {
      const node = chat.nodes.get(key)
      if (!node) continue
      const entry = entryFromNode(node as { kind?: string; data?: unknown })
      if (entry) entries.push(entry)
    }
  }

  return format === 'md' ? formatMarkdown(entries) : formatTxt(entries)
}

export function downloadText(text: string, filename: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadExport(
  snapshot: ConversationSnapshot | null | undefined,
  selected: Record<string, true>,
  format: ExportFormat,
): void {
  const text = buildExport(snapshot, selected, format)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  if (format === 'md') {
    downloadText(text, `dsh-chat-${stamp}.md`, 'text/markdown;charset=utf-8')
  } else {
    downloadText(text, `dsh-chat-${stamp}.txt`, 'text/plain;charset=utf-8')
  }
}
