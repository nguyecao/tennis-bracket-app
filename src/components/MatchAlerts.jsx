import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { alertsFor, decidedMatches } from '../lib/alerts'

const SHOW_MS = { win: 6000, loss: 4000 }
const MAX_SHOWN = 3 // more than this at once (e.g. back from a locked phone): "+N more"
const SETTING = 'tennis-bracket-alerts'

// Viewer's on/off switch for match alerts, remembered on this device (on by default)
export function useAlertsSetting() {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(SETTING) !== 'off'
    } catch {
      return true
    }
  })
  const set = (value) => {
    setOn(value)
    try {
      localStorage.setItem(SETTING, value ? 'on' : 'off')
    } catch {
      // storage blocked: the setting lasts for this visit
    }
  }
  return [on, set]
}

// Watch for results involving highlighted players. Only results that happen while you're
// here (or that arrive when you come back to the page), not ones already decided when you
// opened it.
//
// Each result is held for a few seconds before its alert goes out, so the host can fix a
// mis-tap: if that match's result changes or is undone during the hold, the pending alert is
// dropped (a corrected result starts its own hold). The alert is written when the hold ends,
// so it uses the latest result, score and highlights.
//
// If the host opens that match's score box during the hold, the alert waits until the box is
// closed (saved: the alert includes the score), up to MAX_SCORE_WAIT_MS so it can't get stuck.
// hostScoring: the match whose score box the host has open, or null.
const HOLD_MS = 5000
const MAX_SCORE_WAIT_MS = 2 * 60 * 1000

export function useMatchAlerts(t, brackets, followed, enabled, hostScoring = null) {
  const decided = decidedMatches(brackets)
  const seen = useRef(null)
  seen.current ??= decided
  const latest = useRef(null)
  latest.current = { t, brackets, followed, enabled, decided, hostScoring }
  const holds = useRef(new Map()) // matchId -> timer for a result waiting to be announced
  const waiting = useRef(new Map()) // matchId -> winner, held until the host closes its score box
  const [list, setList] = useState([])
  const nextId = useRef(0)

  const signature = Object.entries(decided)
    .map(([id, w]) => `${id}:${w}`)
    .join('|')
  // Announce a held result (if it still stands)
  function announce(id, winner) {
    const now = latest.current
    if (!now.enabled || now.decided[id] !== winner) return
    const added = alertsFor(id, now.t, now.brackets, now.followed)
      .filter((a) => !(a.kind === 'win' && a.champion)) // the champion celebration already covers this
      .map((a) => ({ ...a, id: ++nextId.current }))
    if (added.length) setList((old) => [...old, ...added])
  }

  useEffect(() => {
    const before = seen.current
    seen.current = decided
    const changed = new Set([...Object.keys(before), ...Object.keys(decided)].filter((id) => before[id] !== decided[id]))

    for (const id of changed) {
      // A result that changes (or is undone) during its hold never gets announced
      clearTimeout(holds.current.get(id))
      holds.current.delete(id)
      waiting.current.delete(id)
      const winner = decided[id]
      if (!winner) continue
      const timer = setTimeout(() => {
        holds.current.delete(id)
        if (latest.current.hostScoring !== id) return announce(id, winner)
        // The host is entering this match's score: wait for it (but not forever)
        waiting.current.set(id, winner)
        holds.current.set(
          id,
          setTimeout(() => {
            holds.current.delete(id)
            if (waiting.current.delete(id)) announce(id, winner)
          }, MAX_SCORE_WAIT_MS)
        )
      }, HOLD_MS)
      holds.current.set(id, timer)
    }

    // Alerts already showing for a result that was then undone or changed go away
    if (changed.size) {
      setList((old) => old.filter((a) => decided[a.matchId] === (a.kind === 'win' ? a.name : a.opponent)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // The host closed a score box: announce the results that were waiting for it
  useEffect(() => {
    for (const [id, winner] of [...waiting.current]) {
      if (id === hostScoring) continue
      waiting.current.delete(id)
      clearTimeout(holds.current.get(id))
      holds.current.delete(id)
      announce(id, winner)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostScoring])

  // Leaving the tournament: forget anything still on hold
  useEffect(() => {
    const pending = holds.current
    return () => pending.forEach(clearTimeout)
  }, [])

  // Switched off: clear what's showing (anything on hold is skipped when its time comes)
  useEffect(() => {
    if (!enabled) setList([])
  }, [enabled])

  const dismiss = (id) => setList((l) => l.filter((a) => a.id !== id))
  const dismissMatch = (matchId) => setList((l) => l.filter((a) => a.matchId !== matchId))
  const dismissAll = () => setList([])
  return { list, dismiss, dismissMatch, dismissAll }
}

// The alerts: top of the screen on phones, bottom left on bigger screens.
// onOpen(alert): show that match. onMore(): show the Players tab.
export function AlertStack({ list, onDismiss, onDismissAll, onOpen, onMore }) {
  // The stack stays in the page even when empty, so screen readers announce new alerts
  const extra = list.length > MAX_SHOWN ? list.length - (MAX_SHOWN - 1) : 0
  const shown = extra ? list.slice(0, MAX_SHOWN - 1) : list

  return createPortal(
    <div className="alert-stack" role="status" aria-live="polite">
      {shown.map((a) => (
        <Alert key={a.id} alert={a} onDismiss={() => onDismiss(a.id)} onOpen={() => onOpen(a)} />
      ))}
      {extra > 0 && (
        <div className="match-alert more">
          <button className="alert-main" onClick={onMore}>
            <span className="alert-badge" aria-hidden="true">
              ★
            </span>
            <span>
              <span className="alert-title">
                +{extra} more result{extra > 1 ? 's' : ''}
              </span>
              <span className="alert-sub">See your ★ players on the Players tab</span>
            </span>
          </button>
          <button className="alert-close" aria-label="Dismiss all" onClick={onDismissAll}>
            ✕
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

function Alert({ alert: a, onDismiss, onOpen }) {
  const ms = SHOW_MS[a.kind]
  const [leaving, setLeaving] = useState(false)
  const [counting, setCounting] = useState(false) // the countdown (and its bar) is running
  const [paused, setPaused] = useState(false) // pointer over it, or keyboard focus inside
  const done = useRef(onDismiss)
  done.current = onDismiss
  const left = useRef(ms)

  // Count down only while the page is on screen (so alerts wait for you to come back) and
  // not while you're pointing at or tabbed into the alert (so you can read it)
  useEffect(() => {
    if (paused) return
    let timer
    let startedAt
    const start = () => {
      if (document.hidden || timer) return
      startedAt = Date.now()
      setCounting(true)
      timer = setTimeout(() => setLeaving(true), left.current)
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      if (timer) left.current = Math.max(500, left.current - (Date.now() - startedAt))
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', start)
    }
  }, [paused])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => done.current(), 250)
    return () => clearTimeout(t)
  }, [leaving])

  const win = a.kind === 'win'
  return (
    <div
      className={`match-alert ${a.kind}${leaving ? ' leaving' : ''}${counting ? ' counting' : ''}${paused ? ' paused' : ''}`}
      style={{ '--ms': `${ms}ms` }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
    >
      <button className="alert-main" onClick={onOpen}>
        <span className="alert-badge" aria-hidden="true">
          {win ? '🏆' : '★'}
        </span>
        <span>
          <span className="alert-title">
            {win ? (
              <>
                <span className="alert-star">★</span> {a.name} won!
              </>
            ) : (
              `${a.name} lost`
            )}
          </span>
          <span className="alert-sub">
            {a.verb} {a.opponent}
            {a.score && <b> {a.score}</b>} · {a.next}
          </span>
          <span className="alert-tap">
            <span className="touch-only">Tap to see the match</span>
            <span className="mouse-only">Click to see the match</span>
          </span>
        </span>
      </button>
      <button className="alert-close" aria-label="Dismiss" onClick={() => setLeaving(true)}>
        ✕
      </button>
      {win && (
        <span className="alert-sparks" aria-hidden="true">
          {['★', '✦', '✦', '★', '✦', '★'].map((s, i) => (
            <span key={i} style={{ '--i': i }}>
              {s}
            </span>
          ))}
        </span>
      )}
      <span className="alert-bar" aria-hidden="true" />
    </div>
  )
}
