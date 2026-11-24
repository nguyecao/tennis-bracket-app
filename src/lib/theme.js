import { useEffect, useState } from 'react'

// Color themes. Colors live in App.css under [data-theme='...'].
export const THEMES = [
  { id: 'classic', name: 'Classic', emoji: '🎾' },
  { id: 'wimbledon', name: 'Wimbledon', emoji: '🍓' }, // strawberries & cream
  { id: 'australian-open', name: 'Australian Open', emoji: '🦘' },
  { id: 'us-open', name: 'US Open', emoji: '🗽' }, // New York
  { id: 'roland-garros', name: 'Roland Garros', emoji: '🥐' }, // Paris
]

const KEY = 'tennis-bracket-theme'
const findTheme = (id) => THEMES.find((t) => t.id === id) || THEMES[0]

function saved() {
  try {
    return findTheme(localStorage.getItem(KEY)).id
  } catch {
    return THEMES[0].id
  }
}

const favicon = (emoji) =>
  `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`

// Returns the full theme object ({ id, name, emoji }) and a setter that takes an id.
// persist: false (viewers) = follow the host's theme without changing your own saved choice.
export function useTheme({ persist = true } = {}) {
  const [id, setId] = useState(saved)
  const theme = findTheme(id)

  useEffect(() => {
    document.documentElement.dataset.theme = theme.id
    document.querySelector("link[rel='icon']")?.setAttribute('href', favicon(theme.emoji))
    // Tint the phone's browser bar to match the page background
    const bar = getComputedStyle(document.documentElement).getPropertyValue('--surround').trim()
    document.querySelector("meta[name='theme-color']")?.setAttribute('content', bar)
    if (!persist) return
    try {
      localStorage.setItem(KEY, theme.id)
    } catch {
      // storage blocked: theme still applies for this visit
    }
  }, [theme, persist])

  return [theme, setId]
}
