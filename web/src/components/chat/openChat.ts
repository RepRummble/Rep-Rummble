export const OPEN_CHAT_EVENT = 'rr:open-chat'

/** Opens the floating Rumi chat from anywhere on the site, optionally asking a question right away. */
export function openChat(message?: string) {
  window.dispatchEvent(new CustomEvent<{ message?: string }>(OPEN_CHAT_EVENT, { detail: { message } }))
}
