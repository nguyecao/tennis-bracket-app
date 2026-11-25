// Cheers: emoji reactions that float up everyone's screen in a live room.
// Nothing is saved. A viewer sends { cheer: '👏' } to the host; the host checks it and
// passes it on to everyone else in the room.
import { THEMES, findTheme } from './theme'

export const CHEERS = ['👏', '🔥', '😮', '🎉']

// Names for screen readers (and tooltips)
const NAMES = {
  '👏': 'Applause',
  '🔥': 'Fire',
  '😮': 'Wow',
  '🎉': 'Celebrate',
  '🎾': 'Tennis ball',
  '🍓': 'Strawberry',
  '🦘': 'Kangaroo',
  '🗽': 'Statue of Liberty',
  '🥐': 'Croissant',
}
export const cheerName = (emoji) => NAMES[emoji] || 'Cheer'

// The tray: the four cheers plus the theme's own emoji (🎾 🍓 🦘 🗽 🥐)
export const trayFor = (themeId) => [...CHEERS, findTheme(themeId).emoji]

const ALLOWED = new Set([...CHEERS, ...THEMES.map((t) => t.emoji)])
export const isCheer = (m) => !!m && typeof m.cheer === 'string' && ALLOWED.has(m.cheer)

// Spam limit: a quick burst of BURST cheers, then one more every REFILL_MS.
// Used by the Cheer button (so people can see it) and again by the host for each
// viewer (so a modified page can't flood the room).
export const BURST = 5
export const REFILL_MS = 2000

export function makeAllowance(burst = BURST, refillMs = REFILL_MS) {
  let tokens = burst
  let last = Date.now()
  const refill = () => {
    const now = Date.now()
    tokens = Math.min(burst, tokens + (now - last) / refillMs)
    last = now
  }
  return {
    take() {
      refill()
      if (tokens < 1) return false
      tokens -= 1
      return true
    },
    // whole cheers available, and how far the next one has refilled (0–1)
    peek() {
      refill()
      return { left: Math.floor(tokens), progress: tokens >= burst ? 1 : tokens % 1 }
    },
  }
}

// This person's own allowance. Kept for the whole visit (not per button), so it doesn't
// reset when the Cheer button disappears and comes back (a dropped connection, cheers
// switched off and on). The host keeps its own count for each viewer.
export const myAllowance = makeAllowance()

// The host's check on each viewer is a little looser than the button, so cheers that
// arrive bunched up or a moment early (network delays) aren't wrongly dropped.
export const viewerAllowance = () => makeAllowance(BURST + 1, REFILL_MS * 0.8)

// Cheers to show on this screen (received, or sent from here)
const listeners = new Set()
export function showCheer(emoji) {
  listeners.forEach((fn) => fn(emoji))
}
export function onCheer(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
