/**
 * @dsh-external/dsh-chat-tools — host half.
 *
 * The whole feature lives in the browser client half: turn collapsing,
 * multi-select/select-all, and Markdown/TXT export are all DOM/UI concerns.
 * The host half intentionally does nothing; keeping it present lets the
 * package mount through the standard DSH bundle channel.
 */
export const name = 'dsh-chat-tools'
export const inject: string[] = []

export function apply(): void {
  // no host behavior needed
}
