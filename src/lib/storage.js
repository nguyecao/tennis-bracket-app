import { useEffect, useState } from 'react'
import { isTournament } from './bracket'
import { GROUP_SIZES } from './groups'

// The host's state (names, options, bracket, room code), saved in localStorage.
const KEY = 'tennis-bracket'
const START = {
  name: '', // tournament name; empty = default name
  date: '', // "YYYY-MM-DD"; empty = today
  text: '',
  mode: 'shuffle',
  consolation: false,
  format: 'knockout', // or 'groups'
  groupSize: 4, // a number, or 'all' for one group
  advance: 2,
  tournament: null,
  room: null,
}

function load() {
  try {
    const saved = { ...START, ...JSON.parse(localStorage.getItem(KEY)) }
    if (!isTournament(saved.tournament)) saved.tournament = null
    if (typeof saved.text !== 'string') saved.text = ''
    if (typeof saved.name !== 'string') saved.name = ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saved.date)) saved.date = ''
    // Settings from an older version, or edited by hand, fall back to defaults
    const allowed = (value, options, fallback) => (options.includes(value) ? value : fallback)
    saved.mode = allowed(saved.mode, ['shuffle', 'rank'], START.mode)
    saved.format = allowed(saved.format, ['knockout', 'groups'], START.format)
    saved.groupSize = allowed(saved.groupSize, [...GROUP_SIZES, 'all'], START.groupSize)
    saved.advance = allowed(saved.advance, [1, 2, 3, 'all'], START.advance)
    saved.consolation = saved.consolation === true
    if (typeof saved.room !== 'string') saved.room = null
    return saved
  } catch {
    return START
  }
}

// The room this browser hosts (used to spot someone opening their own room link)
export function savedRoom() {
  try {
    return JSON.parse(localStorage.getItem(KEY))?.room || null
  } catch {
    return null
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
