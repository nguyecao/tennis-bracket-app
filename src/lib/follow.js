import { useEffect, useState } from 'react'

// Players this person has highlighted (★). Saved on this device only, per tournament.
const KEY = 'tennis-bracket-follow'

export function useFollowed(tournamentId) {
  const [names, setNames] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY))
      return saved?.id === tournamentId && Array.isArray(saved.names) ? saved.names : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ id: tournamentId, names }))
    } catch {
      // storage blocked: highlights still work for this visit
    }
  }, [tournamentId, names])

  const toggle = (name) =>
    setNames((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]))
  const clear = () => setNames([])

  return { followed: new Set(names), toggle, clear }
}
