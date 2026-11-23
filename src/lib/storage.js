import { useEffect, useState } from 'react'
import { isTournament } from './bracket'

// The host's state (names, options, bracket, room code), saved in localStorage.
const KEY = 'tennis-bracket'
const START = { text: '', mode: 'shuffle', consolation: false, tournament: null, room: null }

function load() {
  try {
    const saved = { ...START, ...JSON.parse(localStorage.getItem(KEY)) }
    if (!isTournament(saved.tournament)) saved.tournament = null
    if (typeof saved.text !== 'string') saved.text = ''
    return saved
  } catch {
    return START
  }
}

export function useSavedState() {
  const [state, setState] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage full or blocked (e.g. some private modes): keep working without saving
    }
  }, [state])
  // Another tab changed the saved state: pick it up so tabs never overwrite each other.
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setState(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const update = (patch) => setState((s) => ({ ...s, ...patch }))
  return [state, update]
}
